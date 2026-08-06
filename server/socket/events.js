// Unified socket event names for room management, cinematic synchronization, and social interaction
export const SOCKET_EVENTS = {
  JOIN_REALM: 'joinRealm',
  LEAVE_REALM: 'leaveRealm',
  HOST_CHANGED: 'hostChanged',
  MEMBER_JOINED: 'memberJoined',
  MEMBER_LEFT: 'memberLeft',
  TYPING_START: 'typingStart',
  TYPING_STOP: 'typingStop',
  PRESENCE_UPDATE: 'presenceUpdate',
  REALM_UPDATE: 'realmUpdate',

  // Video sync events
  VIDEO_LOADED: 'videoLoaded',
  VIDEO_CHANGED: 'videoChanged',
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK: 'seek',
  VIDEO_ENDED: 'videoEnded',
  SYNC_STATE: 'syncState',
  PLAYBACK_UPDATE: 'playbackUpdate',

  // Social/Chat events
  CHAT_MESSAGE: 'chatMessage',
  EDIT_MESSAGE: 'editMessage',
  EMOJI_REACTION: 'emojiReaction',
  MESSAGE_REACTION: 'messageReaction',
  PIN_MESSAGE: 'pinMessage',
  UNPIN_MESSAGE: 'unpinMessage',
  DELETE_MESSAGE: 'deleteMessage',
  USER_MUTED: 'userMuted',
  USER_TIMEOUT: 'userTimeout',
  USER_KICKED: 'userKicked',
  STATUS_UPDATE: 'statusUpdate',
  MARK_READ: 'markRead',

  // Voice/Video Call events
  JOIN_VOICE: 'joinVoice',
  LEAVE_VOICE: 'leaveVoice',
  PEER_CONNECTED: 'peerConnected',
  PEER_DISCONNECTED: 'peerDisconnected',
  SIGNAL: 'signal',
  SPEAKING: 'speaking',
  CALL_STATE_CHANGED: 'callStateChanged',
  FORCE_STOP_SCREEN_SHARE: 'forceStopScreenShare',
  CAMERA_ENABLED: 'cameraEnabled',
  CAMERA_DISABLED: 'cameraDisabled',
  MIC_MUTED: 'micMuted',
  MIC_UNMUTED: 'micUnmuted',
  SCREEN_SHARE_STARTED: 'screenShareStarted',
  SCREEN_SHARE_STOPPED: 'screenShareStopped',
  CALL_RECOVERED: 'callRecovered',
};

