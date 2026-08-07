import { presenceService } from '../services/presenceService.js';

export const registerCallHandlers = (io, socket) => {
  // Join voice session inside the realm room
  socket.on('joinVoice', ({ code }) => {
    if (!code) return;
    const roomCode = code.toUpperCase().trim();

    // Set voice status on the presence service
    const updateResult = presenceService.joinVoice(socket.id);
    if (!updateResult) return;

    const { members } = updateResult;

    // Get permissions for this room
    const permissions = presenceService.getCallPermissions(roomCode);

    // Get list of other members in voice call to establish mesh peer connections
    const otherCallParticipants = members
      .filter(m => m.inCall && m.socketId !== socket.id)
      .map(m => ({ socketId: m.socketId, name: m.name }));

    // Send call info and permissions back to the joiner
    socket.emit('voiceJoined', { 
      success: true, 
      permissions,
      participants: otherCallParticipants
    });

    // Notify other voice session members about the new participant
    socket.to(roomCode).emit('peerJoinedVoice', { 
      socketId: socket.id, 
      name: members.find(m => m.socketId === socket.id)?.name || 'Guest' 
    });

    // Broadcast updated presence list (reflecting user's inCall: true)
    io.to(roomCode).emit('presenceUpdate', { members });
    console.log(`[Call] User ${socket.id} joined voice session in realm ${roomCode}`);
  });

  // Leave voice session
  socket.on('leaveVoice', ({ code }) => {
    if (!code) return;
    const roomCode = code.toUpperCase().trim();

    const updateResult = presenceService.leaveVoice(socket.id);
    if (!updateResult) return;

    const { members } = updateResult;

    // Broadcast updated presence list
    io.to(roomCode).emit('presenceUpdate', { members });

    // Notify other participants to tear down WebRTC connection
    socket.to(roomCode).emit('peerLeftVoice', { socketId: socket.id });
    console.log(`[Call] User ${socket.id} left voice session in realm ${roomCode}`);
  });

  // Relay WebRTC signaling between two users
  socket.on('signal', ({ target, signal }) => {
    if (!target) return;
    io.to(target).emit('signal', { sender: socket.id, signal });
  });

  // Broadcast speaking indicator state change
  socket.on('speaking', ({ code, speaking }) => {
    if (!code) return;
    const roomCode = code.toUpperCase().trim();
    
    presenceService.updateVoiceState(socket.id, 'speaking', speaking);
    socket.to(roomCode).emit('speaking', { socketId: socket.id, speaking });
  });

  // Broadcast camera state change
  socket.on('cameraState', ({ code, enabled }) => {
    if (!code) return;
    const roomCode = code.toUpperCase().trim();

    const updateResult = presenceService.updateVoiceState(socket.id, 'cameraEnabled', enabled);
    if (updateResult) {
      io.to(roomCode).emit('presenceUpdate', { members: updateResult.members });
    }
  });

  // Broadcast mic mute state change
  socket.on('micState', ({ code, muted }) => {
    if (!code) return;
    const roomCode = code.toUpperCase().trim();

    const updateResult = presenceService.updateVoiceState(socket.id, 'micMuted', muted);
    if (updateResult) {
      io.to(roomCode).emit('presenceUpdate', { members: updateResult.members });
    }
  });

  // Broadcast screen sharing state change
  socket.on('screenShareState', ({ code, sharing }) => {
    if (!code) return;
    const roomCode = code.toUpperCase().trim();

    const updateResult = presenceService.updateVoiceState(socket.id, 'screenSharing', sharing);
    if (updateResult) {
      io.to(roomCode).emit('presenceUpdate', { members: updateResult.members });
      
      if (sharing) {
        const sharer = updateResult.members.find(m => m.socketId === socket.id);
        socket.to(roomCode).emit('screenShareStarted', { 
          socketId: socket.id, 
          name: sharer ? sharer.name : 'A participant' 
        });
      } else {
        socket.to(roomCode).emit('screenShareStopped', { socketId: socket.id });
      }
    }
  });

  // Handle Host permission state updates
  socket.on('callStateChanged', ({ code, permissions }) => {
    if (!code || !permissions) return;
    const roomCode = code.toUpperCase().trim();

    const members = presenceService.getMembers(roomCode);
    const self = members.find(m => m.socketId === socket.id);

    // Enforce host validation
    if (!self || self.role !== 'host') {
      console.warn(`[Call] Unauthorized permission change attempt by ${socket.id}`);
      return;
    }

    const updatedPermissions = presenceService.updateCallPermissions(roomCode, permissions);
    
    // Broadcast permission state to the whole room
    io.to(roomCode).emit('callStateChanged', { permissions: updatedPermissions });
    console.log(`[Call] Host updated permissions in realm ${roomCode}:`, updatedPermissions);
  });

  // Handle Host forcing another user to stop screen sharing
  socket.on('forceStopScreenShare', ({ code, targetSocketId }) => {
    if (!code || !targetSocketId) return;
    const roomCode = code.toUpperCase().trim();

    const members = presenceService.getMembers(roomCode);
    const self = members.find(m => m.socketId === socket.id);

    if (!self || self.role !== 'host') {
      console.warn(`[Call] Unauthorized screen share termination attempt by ${socket.id}`);
      return;
    }

    io.to(targetSocketId).emit('forceStopScreenShare');
    console.log(`[Call] Host forced socket ${targetSocketId} to stop screen sharing`);
  });

  // Handle automatic peer disconnect cleanup
  socket.on('disconnect', () => {
    // Check all rooms in presenceService to see if this socket was in voice call
    // Note: roomHandler removes the member in its own disconnect, so we query presence
    // before removal, or roomHandler's removeMember call tells us if they were in call.
    // To make this simple and independent, we let the callHandler do a fast cleanup
    // by broadcasting 'peerLeftVoice' to rooms where they might have been connected.
    // Since roomHandler removeMember runs in the same tick or socket.on('disconnect')
    // listeners run in order of registration, we can broadcast cleanup signals.
    for (const [roomCode] of io.sockets.adapter.rooms.entries()) {
      // If the socket was in the room and is now disconnected, notify remaining peers
      // standard socket.to(roomCode) doesn't send to the disconnected socket, which is perfect
      socket.to(roomCode).emit('peerLeftVoice', { socketId: socket.id });
    }
  });
};
