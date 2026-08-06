import { SOCKET_EVENTS } from '../events.js';
import Realm from '../../models/Realm.js';
import { presenceService } from '../services/presenceService.js';
import { findRealmByQuery, inMemoryRealms } from '../../controllers/realmController.js';

const JOIN_MESSAGES = [
  "A new traveler has entered the realm.",
  "The stars welcome another guest.",
  "The fireplace grows a little warmer.",
  "The story continues with one more friend."
];

const getRandomJoinMessage = () => {
  return JOIN_MESSAGES[Math.floor(Math.random() * JOIN_MESSAGES.length)];
};

export const registerRoomHandlers = (io, socket) => {
  const handleJoinRoom = async (roomId, user) => {
    console.log('[Logging] Join Room Received', roomId, user);
    try {
      let code = '';
      let userData = user;
      if (typeof roomId === 'string') {
        code = roomId;
      } else if (roomId && typeof roomId === 'object') {
        code = roomId.code || roomId.roomId || roomId.id || '';
        if (!userData) userData = roomId.user;
      }
      if (!code) return;

      const cleanCode = code.toUpperCase().trim();
      const userId = userData?.id || userData?._id || userData?.userId || socket.user?.id || `guest_${socket.id.slice(-4)}`;
      const username = typeof userData === 'string' ? userData : (userData?.displayName || userData?.username || userData?.name || socket.user?.username || `Guest_${socket.id.slice(-4)}`);

      let realm = await findRealmByQuery({ code: cleanCode });
      
      if (!realm) {
        // Auto-create room data if not found so room joining NEVER fails
        realm = {
          realmId: cleanCode,
          name: `Realm ${cleanCode}`,
          code: cleanCode,
          inviteCode: cleanCode,
          owner: userId,
          members: [userId],
          admins: [],
          currentMembers: []
        };
        inMemoryRealms.set(cleanCode, realm);
      }

      const currentMembers = realm.currentMembers || [];
      const memberIndex = currentMembers.findIndex(
        m => m.socketId === socket.id
      );

      const isOwner = (realm.owner && realm.owner.toString() === userId.toString()) || currentMembers.length === 0;
      const role = isOwner ? 'host' : 'guest';

      const memberData = {
        userId,
        name: username,
        status: isOwner ? 'Choosing Next Movie' : 'Ready',
        statusType: isOwner ? 'choosing' : 'ready',
        color: isOwner ? 'emerald' : 'lavender',
        socketId: socket.id
      };

      if (memberIndex === -1) {
        currentMembers.push(memberData);
      } else {
        currentMembers[memberIndex] = memberData;
      }

      realm.currentMembers = currentMembers;
      if (!realm.members) realm.members = [];
      if (!realm.members.includes(userId)) {
        realm.members.push(userId);
      }

      if (typeof realm.save === 'function') {
        try { await realm.save(); } catch (_) {}
      } else {
        inMemoryRealms.set(cleanCode, realm);
      }

      // standard socket room join
      socket.join(cleanCode);
      console.log('[Logging] Socket Joined Room', cleanCode);

      presenceService.addMember(cleanCode, socket.id, username, role, userId);

      const membersPayload = presenceService.getMembers(cleanCode);
      console.log('[Logging] Members In Room', cleanCode, membersPayload);

      // 1. Send validation success and initial room sync state back to the joining socket
      socket.emit(SOCKET_EVENTS.REALM_UPDATE, { 
        success: true, 
        code: cleanCode, 
        role,
        realm: {
          name: realm.name,
          currentVideo: realm.currentVideo,
          playbackState: realm.playbackState,
          queue: realm.queue,
          chatMessages: realm.chatMessages || [],
          pinnedMessage: realm.pinnedMessage || null
        }
      });

      // 2. Broadcast join notification & presence details to others in room
      socket.to(cleanCode).emit(SOCKET_EVENTS.MEMBER_JOINED, {
        message: getRandomJoinMessage(),
        member: { ...memberData, role },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      // 3. Broadcast updated members presence list to all participants in room
      io.to(cleanCode).emit('room-members', membersPayload);
      io.to(cleanCode).emit(SOCKET_EVENTS.PRESENCE_UPDATE, { members: membersPayload });
      console.log('[Logging] Broadcast Sent (Members list)');

    } catch (err) {
      console.error('[Socket] Error in joinRoom handler:', err);
    }
  };

  // Listen for both join-room and joinRealm events
  socket.on('join-room', (roomId, user) => handleJoinRoom(roomId, user));
  socket.on(SOCKET_EVENTS.JOIN_REALM, (data) => handleJoinRoom(data, data?.user));

  // leaveRealm handler (explicit leave event)
  socket.on(SOCKET_EVENTS.LEAVE_REALM, async ({ code }) => {
    try {
      if (!code) return;
      const cleanCode = code.toUpperCase().trim();
      const userId = socket.user ? socket.user.id : null;
      const username = socket.user ? socket.user.username : 'Guest';

      const realm = await findRealmByQuery({ code: cleanCode });
      if (realm) {
        realm.currentMembers = (realm.currentMembers || []).filter(m => m.userId.toString() !== userId);
        realm.members = (realm.members || []).filter(m => m.toString() !== userId);

        if (typeof realm.save === 'function') {
          try { await realm.save(); } catch (_) {}
        } else {
          inMemoryRealms.set(cleanCode, realm);
        }
      }

      socket.leave(cleanCode);
      const removalResult = presenceService.removeMember(socket.id);
      const membersPayload = removalResult ? removalResult.members : presenceService.getMembers(cleanCode);

      socket.to(cleanCode).emit(SOCKET_EVENTS.MEMBER_LEFT, {
        message: `${username} has left the realm.`,
        memberName: username,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      io.to(cleanCode).emit('room-members', membersPayload);
      io.to(cleanCode).emit(SOCKET_EVENTS.PRESENCE_UPDATE, { members: membersPayload });

      console.log(`[Socket] User ${username} explicitly left room ${cleanCode}`);
    } catch (err) {
      console.error('[Socket] Error in leaveRealm handler:', err);
    }
  });

  // disconnect handler (handles unexpected disconnects)
  socket.on('disconnect', async () => {
    try {
      console.log('[Logging] Disconnect:', socket.id);
      const removalResult = presenceService.removeMember(socket.id);

      if (removalResult) {
        const { roomCode, removedMember, members } = removalResult;
        console.log(`[Logging] Member Removed: ${removedMember.name} from room ${roomCode}`);
        
        socket.to(roomCode).emit(SOCKET_EVENTS.MEMBER_LEFT, {
          message: `${removedMember.name} has disconnected.`,
          memberName: removedMember.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        io.to(roomCode).emit('room-members', members);
        io.to(roomCode).emit(SOCKET_EVENTS.PRESENCE_UPDATE, { members });
      }

      for (const [code, realm] of inMemoryRealms.entries()) {
        if (!realm.currentMembers) continue;
        const disconnectedMemberIndex = realm.currentMembers.findIndex(m => m.socketId === socket.id);
        if (disconnectedMemberIndex !== -1) {
          realm.currentMembers.splice(disconnectedMemberIndex, 1);
        }
      }
    } catch (err) {
      console.error('[Socket] Error in disconnect handler:', err);
    }
  });
};
