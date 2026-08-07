// Cache room participants in-memory
const activePresences = new Map();
const roomPermissions = new Map();

// Generate random colors for new members
const COLORS = ['navy', 'lavender', 'pink', 'gold', 'emerald'];

export const presenceService = {
  addMember(roomCode, socketId, name, roleOverride, userId) {
    const code = roomCode.toUpperCase().trim();
    if (!activePresences.has(code)) {
      activePresences.set(code, []);
    }

    const currentList = activePresences.get(code);

    // If this exact socket is already registered in this room, update it
    const exists = currentList.find(m => m.socketId === socketId);
    if (exists) {
      if (name) exists.name = name;
      if (userId) exists.userId = userId;
      if (roleOverride) exists.role = roleOverride;
      return { members: currentList, newMember: exists };
    }

    // Prefer the caller-supplied role (derived from the Realm's real owner/admin
    // status) over guessing based on join order, so voice-call host permissions
    // always match the actual realm host.
    const isFirst = currentList.length === 0;
    const role = roleOverride || (isFirst ? 'host' : 'guest');
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const newMember = {
      socketId,
      userId: userId || `guest_${socketId.slice(-6)}`,
      name: name || `Traveler ${currentList.length + 1}`,
      status: role === 'host' ? 'Choosing Next Movie' : 'Ready',
      statusType: role === 'host' ? 'choosing' : 'ready',
      role,
      isConnected: true,
      color,
      inCall: false,
      micMuted: false,
      cameraEnabled: false,
      screenSharing: false,
      speaking: false
    };

    currentList.push(newMember);
    console.log(`[Presence] Member ${newMember.name} joined room ${code} as ${role}`);
    return { members: currentList, newMember };
  },

  removeMember(socketId) {
    let result = null;

    for (const [roomCode, members] of activePresences.entries()) {
      const idx = members.findIndex(m => m.socketId === socketId);
      
      if (idx !== -1) {
        const [removedMember] = members.splice(idx, 1);
        console.log(`[Presence] Removed ${removedMember.name} from room ${roomCode}`);

        let newHost = null;

        // If Host disconnected, automatically transfer Host to the next connected member
        if (removedMember.role === 'host' && members.length > 0) {
          members[0].role = 'host';
          newHost = members[0];
          console.log(`[Presence] Host transferred to ${newHost.name} in room ${roomCode}`);
        }

        // Cleanup empty room map keys
        if (members.length === 0) {
          activePresences.delete(roomCode);
          roomPermissions.delete(roomCode);
          console.log(`[Presence] Room ${roomCode} is empty, cleaned up`);
        }

        result = {
          roomCode,
          removedMember,
          hostChanged: !!newHost,
          newHost,
          members
        };
        break;
      }
    }

    return result;
  },

  setRole(socketId, role) {
    for (const [roomCode, members] of activePresences.entries()) {
      const member = members.find(m => m.socketId === socketId);
      if (member) {
        member.role = role;
        return { roomCode, member, members };
      }
    }
    return null;
  },

  updateStatus(socketId, status, statusType) {
    for (const [roomCode, members] of activePresences.entries()) {
      const member = members.find(m => m.socketId === socketId);
      if (member) {
        member.status = status;
        member.statusType = statusType || 'ready';
        return { roomCode, member, members };
      }
    }
    return null;
  },

  getMembers(roomCode) {
    const code = roomCode.toUpperCase().trim();
    return activePresences.get(code) || [];
  },

  joinVoice(socketId) {
    for (const [roomCode, members] of activePresences.entries()) {
      const member = members.find(m => m.socketId === socketId);
      if (member) {
        member.inCall = true;
        member.micMuted = false;
        member.cameraEnabled = false;
        member.screenSharing = false;
        member.speaking = false;
        return { roomCode, members };
      }
    }
    return null;
  },

  leaveVoice(socketId) {
    for (const [roomCode, members] of activePresences.entries()) {
      const member = members.find(m => m.socketId === socketId);
      if (member) {
        member.inCall = false;
        member.micMuted = false;
        member.cameraEnabled = false;
        member.screenSharing = false;
        member.speaking = false;
        return { roomCode, members };
      }
    }
    return null;
  },

  updateVoiceState(socketId, key, value) {
    for (const [roomCode, members] of activePresences.entries()) {
      const member = members.find(m => m.socketId === socketId);
      if (member) {
        member[key] = value;
        return { roomCode, member, members };
      }
    }
    return null;
  },

  getCallPermissions(roomCode) {
    const code = roomCode.toUpperCase().trim();
    if (!roomPermissions.has(code)) {
      roomPermissions.set(code, {
        voiceEnabled: true,
        cameraEnabled: true,
        screenShareAllowed: 'everyone' // everyone, host
      });
    }
    return roomPermissions.get(code);
  },

  updateCallPermissions(roomCode, permissions) {
    const code = roomCode.toUpperCase().trim();
    const current = this.getCallPermissions(code);
    const updated = { ...current, ...permissions };
    roomPermissions.set(code, updated);
    return updated;
  }
};
