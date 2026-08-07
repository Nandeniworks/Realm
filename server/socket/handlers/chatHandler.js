import { SOCKET_EVENTS } from '../events.js';
import Realm from '../../models/Realm.js';
import mongoose from 'mongoose';

// DB check helper
const isDbConnected = () => mongoose.connection.readyState === 1;

// In-memory muted users storage: roomCode -> Map(username/userId -> timeoutMs)
const mutedUsersMap = new Map();

export const isUserMuted = (roomCode, username) => {
  const code = roomCode.toUpperCase().trim();
  if (!mutedUsersMap.has(code)) return false;
  const roomMutes = mutedUsersMap.get(code);
  if (!roomMutes.has(username)) return false;
  
  const expiry = roomMutes.get(username);
  if (expiry && Date.now() > expiry) {
    roomMutes.delete(username);
    return false;
  }
  return true;
};

export const muteUserInRoom = (roomCode, username, durationMinutes = 5) => {
  const code = roomCode.toUpperCase().trim();
  if (!mutedUsersMap.has(code)) {
    mutedUsersMap.set(code, new Map());
  }
  const expiry = durationMinutes > 0 ? Date.now() + durationMinutes * 60 * 1000 : 0;
  mutedUsersMap.get(code).set(username, expiry);
};

export const unmuteUserInRoom = (roomCode, username) => {
  const code = roomCode.toUpperCase().trim();
  if (mutedUsersMap.has(code)) {
    mutedUsersMap.get(code).delete(username);
  }
};

export const registerChatHandlers = (io, socket) => {
  
  // 1. CHAT_MESSAGE
  socket.on(SOCKET_EVENTS.CHAT_MESSAGE, async ({ code, message }) => {
    const cleanCode = code.toUpperCase().trim();
    
    // Check if sender is muted
    if (message?.sender && isUserMuted(cleanCode, message.sender)) {
      socket.emit('errorNotification', { message: 'You are currently muted in this realm.' });
      return;
    }

    const fullMessage = {
      id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderId: message.senderId || (socket.user ? socket.user.id : null),
      sender: message.sender || 'Guest',
      text: message.text || '',
      attachments: message.attachments || [],
      edited: false,
      deleted: false,
      replyTo: message.replyTo || null,
      mentions: message.mentions || [],
      reactions: [],
      readBy: [message.sender || 'Guest'],
      timestamp: message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: message.color || 'lavender',
      isSystem: message.isSystem || false,
      role: message.role || 'guest',
      createdAt: new Date()
    };

    // Broadcast message to everyone inside the room
    io.to(cleanCode).emit(SOCKET_EVENTS.CHAT_MESSAGE, { message: fullMessage });

    // Persist to MongoDB
    try {
      if (isDbConnected()) {
        await Realm.findOneAndUpdate(
          { code: cleanCode },
          { 
            $push: { 
              chatMessages: { 
                $each: [fullMessage], 
                $slice: -200 // Keep up to 200 recent messages
              } 
            } 
          }
        );
      }
    } catch (err) {
      console.error('[ChatHandler] Error saving chat message to DB:', err);
    }
  });

  // 2. EDIT_MESSAGE
  socket.on(SOCKET_EVENTS.EDIT_MESSAGE, async ({ code, id, text }) => {
    const cleanCode = code.toUpperCase().trim();
    const editedAt = new Date().toISOString();

    // Broadcast edit to room
    io.to(cleanCode).emit(SOCKET_EVENTS.EDIT_MESSAGE, { id, text, editedAt });

    try {
      if (isDbConnected()) {
        await Realm.updateOne(
          { code: cleanCode, 'chatMessages.id': id },
          { 
            $set: { 
              'chatMessages.$.text': text,
              'chatMessages.$.edited': true,
              'chatMessages.$.editedAt': editedAt
            } 
          }
        );
      }
    } catch (err) {
      console.error('[ChatHandler] Error editing message in DB:', err);
    }
  });

  // 3. DELETE_MESSAGE
  socket.on(SOCKET_EVENTS.DELETE_MESSAGE, async ({ code, id }) => {
    const cleanCode = code.toUpperCase().trim();

    // Broadcast delete event
    io.to(cleanCode).emit(SOCKET_EVENTS.DELETE_MESSAGE, { id });

    try {
      if (isDbConnected()) {
        await Realm.findOneAndUpdate(
          { code: cleanCode },
          { $pull: { chatMessages: { id } } }
        );
      }
    } catch (err) {
      console.error('[ChatHandler] Error deleting chat message from DB:', err);
    }
  });

  // 4. PIN_MESSAGE & UNPIN_MESSAGE
  socket.on(SOCKET_EVENTS.PIN_MESSAGE, async ({ code, message }) => {
    const cleanCode = code.toUpperCase().trim();

    io.to(cleanCode).emit(SOCKET_EVENTS.PIN_MESSAGE, { message });

    try {
      if (isDbConnected()) {
        await Realm.findOneAndUpdate(
          { code: cleanCode },
          { $set: { pinnedMessage: message } }
        );
      }
    } catch (err) {
      console.error('[ChatHandler] Error updating pinned message in DB:', err);
    }
  });

  socket.on(SOCKET_EVENTS.UNPIN_MESSAGE, async ({ code }) => {
    const cleanCode = code.toUpperCase().trim();

    io.to(cleanCode).emit(SOCKET_EVENTS.PIN_MESSAGE, { message: null });

    try {
      if (isDbConnected()) {
        await Realm.findOneAndUpdate(
          { code: cleanCode },
          { $set: { pinnedMessage: null } }
        );
      }
    } catch (err) {
      console.error('[ChatHandler] Error clearing pinned message in DB:', err);
    }
  });

  // 5. EMOJI_REACTION (Floating Canvas Reaction)
  socket.on(SOCKET_EVENTS.EMOJI_REACTION, ({ code, emoji, username }) => {
    const cleanCode = code.toUpperCase().trim();
    socket.to(cleanCode).emit(SOCKET_EVENTS.EMOJI_REACTION, { emoji, username });
  });

  // 6. MESSAGE_REACTION (Per-message Reaction Toggle)
  socket.on(SOCKET_EVENTS.MESSAGE_REACTION, async ({ code, messageId, emoji, username }) => {
    const cleanCode = code.toUpperCase().trim();

    // Broadcast reaction toggle to all users in room
    io.to(cleanCode).emit(SOCKET_EVENTS.MESSAGE_REACTION, { messageId, emoji, username });

    try {
      if (isDbConnected()) {
        const realm = await Realm.findOne({ code: cleanCode });
        if (realm) {
          const msg = realm.chatMessages.find(m => m.id === messageId);
          if (msg) {
            let reactionObj = msg.reactions.find(r => r.emoji === emoji);
            if (!reactionObj) {
              msg.reactions.push({ emoji, users: [username] });
            } else {
              const uIdx = reactionObj.users.indexOf(username);
              if (uIdx > -1) {
                reactionObj.users.splice(uIdx, 1);
                if (reactionObj.users.length === 0) {
                  msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
                }
              } else {
                reactionObj.users.push(username);
              }
            }
            await realm.save();
          }
        }
      }
    } catch (err) {
      console.error('[ChatHandler] Error toggling message reaction in DB:', err);
    }
  });

  // 7. MODERATION: USER_MUTED / USER_TIMEOUT / USER_KICKED
  socket.on(SOCKET_EVENTS.USER_MUTED, ({ code, username, durationMinutes }) => {
    const cleanCode = code.toUpperCase().trim();
    muteUserInRoom(cleanCode, username, durationMinutes || 5);

    io.to(cleanCode).emit(SOCKET_EVENTS.USER_MUTED, {
      username,
      durationMinutes: durationMinutes || 5,
      message: `${username} has been muted for ${durationMinutes || 5} minute(s).`
    });
  });

  socket.on(SOCKET_EVENTS.USER_KICKED, async ({ code, username, userId }) => {
    const cleanCode = code.toUpperCase().trim();
    
    io.to(cleanCode).emit(SOCKET_EVENTS.USER_KICKED, {
      username,
      userId,
      message: `${username} was removed from the realm.`
    });

    try {
      if (isDbConnected()) {
        await Realm.findOneAndUpdate(
          { code: cleanCode },
          { 
            $pull: { 
              currentMembers: { name: username },
              members: userId
            } 
          }
        );
      }
    } catch (err) {
      console.error('[ChatHandler] Error kicking member from DB:', err);
    }
  });

  // 8. MARK_READ (Read Receipts)
  socket.on(SOCKET_EVENTS.MARK_READ, async ({ code, messageId, username }) => {
    const cleanCode = code.toUpperCase().trim();
    socket.to(cleanCode).emit(SOCKET_EVENTS.MARK_READ, { messageId, username });

    try {
      if (isDbConnected() && messageId && username) {
        await Realm.updateOne(
          { code: cleanCode, 'chatMessages.id': messageId },
          { $addToSet: { 'chatMessages.$.readBy': username } }
        );
      }
    } catch (err) {
      console.error('[ChatHandler] Error marking message read in DB:', err);
    }
  });
};

