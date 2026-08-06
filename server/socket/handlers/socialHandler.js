import User from '../../models/User.js';

// Map of userId -> Set of socketIds for instant targeted messaging
const userSocketMap = new Map();

export const registerSocialHandlers = (io, socket) => {
  const userId = socket.user?.id;

  if (userId) {
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
  }

  // Handle direct Friend Request real-time notification
  socket.on('friendRequest', ({ targetUserId, senderData }) => {
    if (!targetUserId) return;
    const targetSockets = userSocketMap.get(targetUserId);
    if (targetSockets) {
      targetSockets.forEach(sId => {
        io.to(sId).emit('friendRequest', {
          sender: senderData || { id: socket.user?.id, username: socket.user?.username }
        });
        io.to(sId).emit('notificationCreated', {
          title: 'New Friend Request',
          message: `${senderData?.displayName || socket.user?.username} sent you a friend request.`
        });
      });
    }
  });

  // Handle Friend Request Accepted
  socket.on('friendAccepted', ({ targetUserId, userData }) => {
    if (!targetUserId) return;
    const targetSockets = userSocketMap.get(targetUserId);
    if (targetSockets) {
      targetSockets.forEach(sId => {
        io.to(sId).emit('friendAccepted', {
          user: userData || { id: socket.user?.id, username: socket.user?.username }
        });
        io.to(sId).emit('notificationCreated', {
          title: 'Friend Request Accepted',
          message: `${userData?.displayName || socket.user?.username} accepted your friend request.`
        });
      });
    }
  });

  // Handle Friend Removed
  socket.on('friendRemoved', ({ targetUserId }) => {
    if (!targetUserId) return;
    const targetSockets = userSocketMap.get(targetUserId);
    if (targetSockets) {
      targetSockets.forEach(sId => {
        io.to(sId).emit('friendRemoved', { friendId: socket.user?.id });
      });
    }
  });

  // Handle Presence Change (online, away, watching, dnd, invisible)
  socket.on('presenceChanged', async ({ status }) => {
    if (!userId || !status) return;

    try {
      await User.findByIdAndUpdate(userId, { presenceStatus: status });
      
      // Broadcast to user's friends
      const user = await User.findById(userId).populate('friends', '_id');
      if (user && user.friends) {
        user.friends.forEach(friend => {
          const friendSockets = userSocketMap.get(friend._id.toString());
          if (friendSockets) {
            friendSockets.forEach(sId => {
              io.to(sId).emit('presenceChanged', {
                userId,
                status: status === 'invisible' ? 'offline' : status
              });
            });
          }
        });
      }
    } catch (err) {
      console.error('[Social Socket] Error updating presence:', err);
    }
  });

  // Handle Direct Invite Sent (Invite to Realm / Voice / Watch Session)
  socket.on('inviteSent', ({ targetUserId, inviteData }) => {
    if (!targetUserId || !inviteData) return;
    const targetSockets = userSocketMap.get(targetUserId);
    if (targetSockets) {
      targetSockets.forEach(sId => {
        io.to(sId).emit('inviteSent', {
          sender: { id: socket.user?.id, username: socket.user?.username },
          ...inviteData
        });
        io.to(sId).emit('notificationCreated', {
          title: 'Realm Invitation',
          message: `${socket.user?.username} invited you to join realm "${inviteData.realmCode}".`
        });
      });
    }
  });

  // Handle Direct Invite Accepted
  socket.on('inviteAccepted', ({ targetUserId, realmCode }) => {
    if (!targetUserId) return;
    const targetSockets = userSocketMap.get(targetUserId);
    if (targetSockets) {
      targetSockets.forEach(sId => {
        io.to(sId).emit('inviteAccepted', {
          user: { id: socket.user?.id, username: socket.user?.username },
          realmCode
        });
      });
    }
  });

  // Cleanup map on disconnect
  socket.on('disconnect', () => {
    if (userId && userSocketMap.has(userId)) {
      const userSockets = userSocketMap.get(userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        userSocketMap.delete(userId);
      }
    }
  });
};
