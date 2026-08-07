import { useEffect, useState, useCallback } from 'react';
import { SOCKET_EVENTS } from '../../server/socket/events.js';

export function usePresence(socket, roomCode, userName = 'Guest', videoCallbacks = {}, chatHistory = [], initialPin = null) {
  const [members, setMembers] = useState([]);
  const [typingStates, setTypingStates] = useState({}); // socketId -> userName
  const [systemMessages, setSystemMessages] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  // Live Chat States
  const [liveMessages, setLiveMessages] = useState([]);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [activeReaction, setActiveReaction] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  // Sync initial DB values when they load
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setLiveMessages(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    if (initialPin) {
      setPinnedMessage(initialPin);
    }
  }, [initialPin]);

  useEffect(() => {
    if (!socket) return;

    // 1. Presence Updates
    socket.on('room-members', (data) => {
      const updatedMembers = Array.isArray(data) ? data : (data?.members || []);
      console.log('Received member list', updatedMembers);
      setMembers(updatedMembers);
    });

    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, (data) => {
      const updatedMembers = Array.isArray(data) ? data : (data?.members || []);
      console.log('Received member list', updatedMembers);
      setMembers(updatedMembers);
    });

    socket.on('queueUpdated', ({ queue }) => {
      if (videoCallbacks.onQueueUpdated) {
        videoCallbacks.onQueueUpdated(queue);
      }
    });

    socket.on(SOCKET_EVENTS.MEMBER_JOINED, ({ message, member, timestamp }) => {
      setSystemMessages(prev => [...prev, {
        id: `sys-${Date.now()}-${Math.random()}`,
        isSystem: true,
        text: message,
        timestamp
      }]);
      showToast(`${member.name} has entered the realm.`);
    });

    socket.on(SOCKET_EVENTS.MEMBER_LEFT, ({ memberName, timestamp }) => {
      setSystemMessages(prev => [...prev, {
        id: `sys-${Date.now()}-${Math.random()}`,
        isSystem: true,
        text: `${memberName} has faded away from the lounge.`,
        timestamp
      }]);
      showToast(`${memberName} left the realm.`);
    });

    socket.on(SOCKET_EVENTS.HOST_CHANGED, ({ newHost, message }) => {
      setSystemMessages(prev => [...prev, {
        id: `sys-${Date.now()}-${Math.random()}`,
        isSystem: true,
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      showToast(`Host transferred to ${newHost.name} ✦`);
    });

    // 2. Typing Alerts
    socket.on(SOCKET_EVENTS.TYPING_START, ({ socketId, userName }) => {
      setTypingStates(prev => ({
        ...prev,
        [socketId]: userName
      }));
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, ({ socketId }) => {
      setTypingStates(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    // 3. Realtime Video Sync Event Listeners
    socket.on(SOCKET_EVENTS.PLAY, ({ currentTime }) => {
      if (videoCallbacks.onPlay) videoCallbacks.onPlay(currentTime);
    });

    socket.on(SOCKET_EVENTS.PAUSE, ({ currentTime }) => {
      if (videoCallbacks.onPause) videoCallbacks.onPause(currentTime);
    });

    socket.on(SOCKET_EVENTS.SEEK, ({ currentTime }) => {
      if (videoCallbacks.onSeek) videoCallbacks.onSeek(currentTime);
    });

    socket.on(SOCKET_EVENTS.SYNC_STATE, ({ currentTime, isPlaying, playbackRate }) => {
      if (videoCallbacks.onSyncState) videoCallbacks.onSyncState({ currentTime, isPlaying, playbackRate });
    });

    socket.on('playbackRateChanged', ({ playbackRate }) => {
      if (videoCallbacks.onPlaybackRateChanged) videoCallbacks.onPlaybackRateChanged(playbackRate);
    });

    socket.on('syncResponse', (state) => {
      if (videoCallbacks.onSyncResponse) videoCallbacks.onSyncResponse(state);
    });

    socket.on(SOCKET_EVENTS.VIDEO_CHANGED, ({ video }) => {
      if (videoCallbacks.onVideoChanged) videoCallbacks.onVideoChanged(video);
      setSystemMessages(prev => [...prev, {
        id: `sys-vid-${Date.now()}`,
        isSystem: true,
        text: `Movie changed to: "${video.title}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    // 4. Chat & Reactions Event Listeners
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, ({ message }) => {
      setLiveMessages(prev => {
        // Prevent duplicate messages by ID
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });

      if (message.sender !== userName) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socket.on(SOCKET_EVENTS.EDIT_MESSAGE, ({ id, text, editedAt }) => {
      setLiveMessages(prev => prev.map(m => {
        if (m.id === id) {
          return { ...m, text, edited: true, editedAt };
        }
        return m;
      }));
    });

    socket.on(SOCKET_EVENTS.DELETE_MESSAGE, ({ id }) => {
      setLiveMessages(prev => prev.filter(m => m.id !== id));
    });

    socket.on(SOCKET_EVENTS.PIN_MESSAGE, ({ message }) => {
      setPinnedMessage(message);
      if (message) {
        showToast(`Pinned: "${message.text.substring(0, 30)}..."`);
      }
    });

    socket.on(SOCKET_EVENTS.EMOJI_REACTION, ({ emoji, username }) => {
      setActiveReaction({
        emoji,
        username,
        id: Date.now() + Math.random()
      });
    });

    socket.on(SOCKET_EVENTS.MESSAGE_REACTION, ({ messageId, emoji, username }) => {
      setLiveMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        const reactions = msg.reactions ? [...msg.reactions] : [];
        const existingIdx = reactions.findIndex(r => r.emoji === emoji);

        if (existingIdx > -1) {
          const userList = [...reactions[existingIdx].users];
          const uIdx = userList.indexOf(username);
          if (uIdx > -1) {
            userList.splice(uIdx, 1);
            if (userList.length === 0) {
              reactions.splice(existingIdx, 1);
            } else {
              reactions[existingIdx] = { emoji, users: userList };
            }
          } else {
            userList.push(username);
            reactions[existingIdx] = { emoji, users: userList };
          }
        } else {
          reactions.push({ emoji, users: [username] });
        }

        return { ...msg, reactions };
      }));
    });

    socket.on(SOCKET_EVENTS.USER_MUTED, ({ username, message }) => {
      showToast(message || `${username} has been muted.`);
      setSystemMessages(prev => [...prev, {
        id: `sys-mute-${Date.now()}`,
        isSystem: true,
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    socket.on(SOCKET_EVENTS.USER_KICKED, ({ username, message }) => {
      showToast(message || `${username} was removed.`);
      setSystemMessages(prev => [...prev, {
        id: `sys-kick-${Date.now()}`,
        isSystem: true,
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    socket.on(SOCKET_EVENTS.MARK_READ, ({ messageId, username }) => {
      setLiveMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const readBy = msg.readBy ? [...msg.readBy] : [];
          if (!readBy.includes(username)) readBy.push(username);
          return { ...msg, readBy };
        }
        return msg;
      }));
    });

    socket.on('errorNotification', ({ message }) => {
      showToast(`⚠️ ${message}`);
    });

    return () => {
      socket.off('room-members');
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE);
      socket.off('queueUpdated');
      socket.off(SOCKET_EVENTS.MEMBER_JOINED);
      socket.off(SOCKET_EVENTS.MEMBER_LEFT);
      socket.off(SOCKET_EVENTS.HOST_CHANGED);
      socket.off(SOCKET_EVENTS.TYPING_START);
      socket.off(SOCKET_EVENTS.TYPING_STOP);
      socket.off(SOCKET_EVENTS.PLAY);
      socket.off(SOCKET_EVENTS.PAUSE);
      socket.off(SOCKET_EVENTS.SEEK);
      socket.off(SOCKET_EVENTS.SYNC_STATE);
      socket.off('playbackRateChanged');
      socket.off('syncResponse');
      socket.off(SOCKET_EVENTS.VIDEO_CHANGED);
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE);
      socket.off(SOCKET_EVENTS.EDIT_MESSAGE);
      socket.off(SOCKET_EVENTS.DELETE_MESSAGE);
      socket.off(SOCKET_EVENTS.PIN_MESSAGE);
      socket.off(SOCKET_EVENTS.EMOJI_REACTION);
      socket.off(SOCKET_EVENTS.MESSAGE_REACTION);
      socket.off(SOCKET_EVENTS.USER_MUTED);
      socket.off(SOCKET_EVENTS.USER_KICKED);
      socket.off(SOCKET_EVENTS.MARK_READ);
      socket.off('errorNotification');
    };
  }, [socket, videoCallbacks, chatHistory, initialPin, userName]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const triggerTyping = (isTyping) => {
    if (!socket || !roomCode) return;
    const event = isTyping ? SOCKET_EVENTS.TYPING_START : SOCKET_EVENTS.TYPING_STOP;
    socket.emit(event, { code: roomCode, userName });
  };

  // Chat message actions
  const sendMessage = ({ text, replyTo = null, mentions = [], attachments = [] }) => {
    if (!socket || !roomCode || !text.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sender: userName,
      text: text.trim(),
      replyTo,
      mentions,
      attachments,
      reactions: [],
      readBy: [userName],
      timestamp: time,
      color: 'lavender',
      role: 'guest',
      edited: false,
      deleted: false
    };

    setLiveMessages(prev => [...prev, message]);
    socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, { code: roomCode, message });
  };

  const editMessage = (id, newText) => {
    if (!socket || !roomCode || !newText.trim()) return;
    const editedAt = new Date().toISOString();

    setLiveMessages(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, text: newText.trim(), edited: true, editedAt };
      }
      return m;
    }));

    socket.emit(SOCKET_EVENTS.EDIT_MESSAGE, { code: roomCode, id, text: newText.trim() });
  };

  const deleteMessage = (id) => {
    if (!socket || !roomCode) return;
    setLiveMessages(prev => prev.filter(m => m.id !== id));
    socket.emit(SOCKET_EVENTS.DELETE_MESSAGE, { code: roomCode, id });
  };

  const pinMessage = (message) => {
    if (!socket || !roomCode) return;
    if (message === null) {
      socket.emit(SOCKET_EVENTS.UNPIN_MESSAGE, { code: roomCode });
    } else {
      socket.emit(SOCKET_EVENTS.PIN_MESSAGE, { code: roomCode, message });
    }
  };

  const sendReaction = (emoji) => {
    if (!socket || !roomCode) return;
    socket.emit(SOCKET_EVENTS.EMOJI_REACTION, { code: roomCode, emoji, username: userName });
  };

  const toggleMessageReaction = (messageId, emoji) => {
    if (!socket || !roomCode) return;

    setLiveMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      const reactions = msg.reactions ? [...msg.reactions] : [];
      const existingIdx = reactions.findIndex(r => r.emoji === emoji);

      if (existingIdx > -1) {
        const userList = [...reactions[existingIdx].users];
        const uIdx = userList.indexOf(userName);
        if (uIdx > -1) {
          userList.splice(uIdx, 1);
          if (userList.length === 0) {
            reactions.splice(existingIdx, 1);
          } else {
            reactions[existingIdx] = { emoji, users: userList };
          }
        } else {
          userList.push(userName);
          reactions[existingIdx] = { emoji, users: userList };
        }
      } else {
        reactions.push({ emoji, users: [userName] });
      }

      return { ...msg, reactions };
    }));

    socket.emit(SOCKET_EVENTS.MESSAGE_REACTION, { code: roomCode, messageId, emoji, username: userName });
  };

  const muteMember = (targetUsername, durationMinutes = 5) => {
    if (!socket || !roomCode) return;
    socket.emit(SOCKET_EVENTS.USER_MUTED, { code: roomCode, username: targetUsername, durationMinutes });
  };

  const kickMember = (targetUsername, targetUserId) => {
    if (!socket || !roomCode) return;
    socket.emit(SOCKET_EVENTS.USER_KICKED, { code: roomCode, username: targetUsername, userId: targetUserId });
  };

  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const typingUsers = Object.values(typingStates);

  return {
    members,
    typingUsers,
    systemMessages,
    toastMessage,
    triggerTyping,
    showToast,

    // Chat exports
    liveMessages,
    pinnedMessage,
    activeReaction,
    unreadCount,
    clearUnreadCount,
    isScrolledUp,
    setIsScrolledUp,
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    sendReaction,
    toggleMessageReaction,
    muteMember,
    kickMember,
    setActiveReaction
  };
}

