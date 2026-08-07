import { Peer } from '../peer/Peer.js';

export class CallEngine {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    
    // Call States
    this.callStatus = 'disconnected'; // disconnected, connecting, connected
    this.muted = false;
    this.cameraActive = false;
    this.screenSharing = false;
    this.speaking = false;
    
    // Streams
    this.localStream = null;
    this.screenStream = null;
    this.remoteStreams = new Map(); // socketId -> MediaStream
    this.peers = new Map(); // socketId -> Peer
    
    // Devices & Settings
    this.devices = {
      microphones: [],
      cameras: [],
      speakers: []
    };
    this.activeDevices = {
      microphone: '',
      camera: '',
      speaker: ''
    };
    this.constraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };
    this.videoResolution = '720p'; // 360p, 720p, 1080p
    
    this.pushToTalk = false;
    this.pushToTalkActive = false;
    this.mirrorLocalVideo = true;
    this.wasInCallBeforeDisconnect = false;

    // Room call permissions (enforced by Host)
    this.callPermissions = {
      voiceEnabled: true,
      cameraEnabled: true,
      screenShareAllowed: 'everyone' // everyone, host
    };

    // Errors & Floating Alerts
    this.callErrors = [];
    this.activeScreenSharer = null; // { name, socketId }

    // Listeners for React binding
    this.listeners = [];
    
    // Audio analyzer variables
    this.audioContext = null;
    this.analyser = null;
    this.analyserInterval = null;
  }

  // React connection registration
  addListener(listener) {
    this.listeners.push(listener);
    // Emit current state on registration
    listener(this.getState());
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  emitStateChange() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  getState() {
    return {
      callStatus: this.callStatus,
      muted: this.muted,
      cameraActive: this.cameraActive,
      screenSharing: this.screenSharing,
      speaking: this.speaking,
      pushToTalk: this.pushToTalk,
      pushToTalkActive: this.pushToTalkActive,
      mirrorLocalVideo: this.mirrorLocalVideo,
      localStream: this.localStream,
      screenStream: this.screenStream,
      remoteStreams: new Map(this.remoteStreams),
      devices: { ...this.devices },
      activeDevices: { ...this.activeDevices },
      constraints: { ...this.constraints },
      videoResolution: this.videoResolution,
      callPermissions: { ...this.callPermissions },
      callErrors: [...this.callErrors],
      activeScreenSharer: this.activeScreenSharer ? { ...this.activeScreenSharer } : null
    };
  }

  // Add a call error to show as a floating alert card
  addError(message, type = 'warning') {
    const errorId = Date.now() + Math.random();
    this.callErrors.push({ id: errorId, message, type });
    this.emitStateChange();
    
    // Auto-remove error after 6 seconds
    setTimeout(() => {
      this.callErrors = this.callErrors.filter(err => err.id !== errorId);
      this.emitStateChange();
    }, 6000);
  }

  removeError(id) {
    this.callErrors = this.callErrors.filter(err => err.id !== id);
    this.emitStateChange();
  }

  // Initialize socket and device list
  init(socket, roomCode) {
    this.socket = socket;
    this.roomCode = roomCode;
    
    this.enumerateDevices();
    this.setupSocketListeners();
    
    // Watch for device change lists from system
    navigator.mediaDevices.ondevicechange = () => this.enumerateDevices();
  }

  async enumerateDevices() {
    try {
      // Prompt permissions check before enumerating
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      this.devices = {
        microphones: devices.filter(d => d.kind === 'audioinput' && d.label !== ''),
        cameras: devices.filter(d => d.kind === 'videoinput' && d.label !== ''),
        speakers: devices.filter(d => d.kind === 'audiooutput' && d.label !== '')
      };

      // Handle cases where labels are blank (permissions not yet requested)
      // If blank, we still query list
      if (this.devices.microphones.length === 0) {
        this.devices.microphones = devices.filter(d => d.kind === 'audioinput');
      }
      if (this.devices.cameras.length === 0) {
        this.devices.cameras = devices.filter(d => d.kind === 'videoinput');
      }
      if (this.devices.speakers.length === 0) {
        this.devices.speakers = devices.filter(d => d.kind === 'audiooutput');
      }
      
      // Auto-select defaults
      if (!this.activeDevices.microphone && this.devices.microphones.length > 0) {
        this.activeDevices.microphone = this.devices.microphones[0].deviceId;
      }
      if (!this.activeDevices.camera && this.devices.cameras.length > 0) {
        this.activeDevices.camera = this.devices.cameras[0].deviceId;
      }
      if (!this.activeDevices.speaker && this.devices.speakers.length > 0) {
        this.activeDevices.speaker = this.devices.speakers[0].deviceId;
      }
      
      this.emitStateChange();
    } catch (err) {
      console.error('[CallEngine] Device enumeration failed:', err);
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // WebRTC signaling receiver
    this.socket.on('signal', async ({ sender, signal }) => {
      const peer = this.peers.get(sender);
      if (peer) {
        await peer.handleSignal(signal);
      }
    });

    // Another peer joins voice
    this.socket.on('peerJoinedVoice', ({ socketId, name }) => {
      if (this.callStatus !== 'connected') return;

      console.log(`[CallEngine] Peer joined voice: ${name} (${socketId}). Initiating WebRTC...`);
      this.addError(`${name} joined the call.`, 'info');
      
      // We initiate the WebRTC Peer connection to them
      this.createPeerConnection(socketId, true);
    });

    // Peer leaves voice or disconnects
    this.socket.on('peerLeftVoice', ({ socketId }) => {
      console.log(`[CallEngine] Peer left voice: ${socketId}`);
      
      const peer = this.peers.get(socketId);
      if (peer) {
        peer.destroy();
        this.peers.delete(socketId);
      }
      this.remoteStreams.delete(socketId);
      
      if (this.activeScreenSharer && this.activeScreenSharer.socketId === socketId) {
        this.activeScreenSharer = null;
      }

      this.emitStateChange();
    });

    // Screen sharing notifications
    this.socket.on('screenShareStarted', ({ socketId, name }) => {
      this.activeScreenSharer = { socketId, name };
      this.emitStateChange();
    });

    this.socket.on('screenShareStopped', ({ socketId }) => {
      if (this.activeScreenSharer && this.activeScreenSharer.socketId === socketId) {
        this.activeScreenSharer = null;
        this.emitStateChange();
      }
    });

    // Host screen share override termination command
    this.socket.on('forceStopScreenShare', () => {
      if (this.screenSharing) {
        this.stopScreenShare();
        this.addError('The Host has stopped your screen sharing.', 'warning');
      }
    });

    // Call permissions synced from Host
    this.socket.on('callStateChanged', ({ permissions }) => {
      this.callPermissions = permissions;
      this.emitStateChange();

      // Enforce constraints immediately
      this.enforceHostPermissions();
    });

    // Socket Reconnection & Call Recovery Handler
    this.socket.on('connect', () => {
      if (this.wasInCallBeforeDisconnect || this.callStatus === 'connected' || this.callStatus === 'connecting') {
        console.log('[CallEngine] Socket reconnected. Re-synchronizing call session...');
        this.addError('Connection restored. Restoring call session...', 'info');
        this.wasInCallBeforeDisconnect = false;
        if (this.roomCode) {
          this.socket.emit('joinVoice', { code: this.roomCode });
          this.socket.emit('callRecovered', { code: this.roomCode });
        }
      }
    });

    this.socket.on('disconnect', (reason) => {
      if (this.callStatus === 'connected') {
        this.wasInCallBeforeDisconnect = true;
        this.addError('Temporary network drop. Reconnecting...', 'warning');
      }
    });
  }

  // Force-apply room level limits
  enforceHostPermissions() {
    // If not host and mic is unmuted, mute it if Host disabled voice
    if (!this.callPermissions.voiceEnabled && !this.isHost() && !this.muted) {
      this.setMicMuteState(true);
      this.addError('Voice channel disabled by Host.', 'warning');
    }

    // If not host and camera is active, turn it off if Host disabled cameras
    if (!this.callPermissions.cameraEnabled && !this.isHost() && this.cameraActive) {
      this.setCameraActiveState(false);
      this.addError('Camera access disabled by Host.', 'warning');
    }

    // If not host and screen sharing, stop sharing if screen share mode restricted to Host only
    if (this.callPermissions.screenShareAllowed === 'host' && !this.isHost() && this.screenSharing) {
      this.stopScreenShare();
      this.addError('Screen sharing restricted to Host only.', 'warning');
    }
  }

  isHost() {
    if (!this.socket) return false;
    // Inspect room details from window/context state or find in presence list
    // A clean helper to check if this client socket is the host:
    // It will be matched on the client wrapper level
    return window.isRealmHost === true;
  }

  // Connect user to the voice session
  async joinCall() {
    if (this.callStatus !== 'disconnected') return;
    
    this.callStatus = 'connecting';
    this.emitStateChange();

    try {
      // 1. Request microphone stream
      await this.setupMediaStream(true, false);
      
      // 2. Notify Socket.IO server if connected
      if (this.socket && this.socket.connected) {
        this.socket.emit('joinVoice', { code: this.roomCode });

        const joinTimeout = setTimeout(() => {
          if (this.callStatus === 'connecting') {
            console.warn('[CallEngine] voiceJoined response timed out. Transitioning to active session.');
            this.callStatus = 'connected';
            this.startAudioAnalysis();
            this.emitStateChange();
          }
        }, 3500);

        // 3. Receive session parameters
        this.socket.once('voiceJoined', ({ success, permissions, participants }) => {
          clearTimeout(joinTimeout);
          if (success) {
            this.callStatus = 'connected';
            if (permissions) this.callPermissions = permissions;
            this.emitStateChange();

            console.log(`[CallEngine] Voice joined successfully. Room permissions:`, permissions);
            
            // Enforce constraints on join
            this.enforceHostPermissions();

            if (participants && Array.isArray(participants)) {
              participants.forEach(p => {
                console.log(`[CallEngine] Establishing connection to existing peer: ${p.name} (${p.socketId})`);
                this.createPeerConnection(p.socketId, true);
              });
            }

            // Start checking microphone audio levels for glowing indications
            this.startAudioAnalysis();
          } else {
            this.leaveCall();
            this.addError('Could not join voice session.', 'error');
          }
        });
      } else {
        // Fallback for static hosts / offline mode
        this.callStatus = 'connected';
        this.startAudioAnalysis();
        this.emitStateChange();
      }

    } catch (err) {
      console.error('[CallEngine] Media stream setup failed on join:', err);
      this.leaveCall();
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.addError('Microphone permission denied.', 'danger');
      } else {
        this.addError('Microphone is unavailable or busy.', 'danger');
      }
    }
  }

  // Create WebRTC Peer connection
  createPeerConnection(targetSocketId, isInitiator) {
    if (this.peers.has(targetSocketId)) {
      this.peers.get(targetSocketId).destroy();
    }

    const peer = new Peer(
      targetSocketId,
      isInitiator,
      this.localStream,
      // onSignal: send signal to peer via websocket
      (signal) => {
        if (this.socket) {
          this.socket.emit('signal', { target: targetSocketId, signal });
        }
      },
      // onStream: remote stream added
      (remoteStream) => {
        this.remoteStreams.set(targetSocketId, remoteStream);
        this.emitStateChange();
      },
      // onDisconnect: peer connection dropped
      () => {
        this.handlePeerDisconnect(targetSocketId);
      }
    );

    this.peers.set(targetSocketId, peer);
    this.emitStateChange();
    
    // Broadcast immediate peer connected state
    if (this.socket) {
      this.socket.emit('peerConnected', { target: targetSocketId });
    }
  }

  handlePeerDisconnect(socketId) {
    const peer = this.peers.get(socketId);
    if (peer) {
      peer.destroy();
      this.peers.delete(socketId);
    }
    this.remoteStreams.delete(socketId);
    
    if (this.activeScreenSharer && this.activeScreenSharer.socketId === socketId) {
      this.activeScreenSharer = null;
    }

    this.emitStateChange();
    console.log(`[CallEngine] Peer connection closed for: ${socketId}`);
  }

  // Disconnect from voice and destroy WebRTC states
  leaveCall() {
    this.callStatus = 'disconnected';
    
    // Clean up speaking audio analyser
    this.stopAudioAnalysis();
    this.speaking = false;

    // Notify backend
    if (this.socket && this.roomCode) {
      this.socket.emit('leaveVoice', { code: this.roomCode });
    }

    // Stop and cleanup local track streams
    this.stopMediaStream();
    this.stopScreenShare();

    // Destroy peer connections
    this.peers.forEach(peer => peer.destroy());
    this.peers.clear();
    this.remoteStreams.clear();
    
    this.activeScreenSharer = null;

    this.emitStateChange();
    console.log('[CallEngine] Call session stopped and WebRTC connection cleaned up.');
  }

  // Toggle Microphone mute state
  setMicMuteState(mute) {
    if (mute && !this.callPermissions.voiceEnabled && !this.isHost()) {
      return; // Cannot unmute if voice disabled by host
    }

    this.muted = mute;
    
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !mute;
      });
    }

    if (this.socket) {
      this.socket.emit('micState', { code: this.roomCode, muted: mute });
    }

    if (mute && this.speaking) {
      this.setSpeaking(false);
    }

    this.emitStateChange();
  }

  // Toggle Camera state
  async setCameraActiveState(active) {
    if (active && !this.callPermissions.cameraEnabled && !this.isHost()) {
      this.addError('Cameras are disabled in this Realm by Host.', 'warning');
      return;
    }

    if (active === this.cameraActive) return;

    try {
      this.cameraActive = active;
      this.emitStateChange();

      // Acquire media streams including camera
      await this.setupMediaStream(true, active);

      if (this.socket) {
        this.socket.emit('cameraState', { code: this.roomCode, enabled: active });
      }
    } catch (err) {
      console.error('[CallEngine] Camera activation failed:', err);
      this.cameraActive = false;
      this.emitStateChange();
      this.addError('Webcam failed to open. Check connection/permissions.', 'danger');
    }
  }

  // Acquire media track streams
  async setupMediaStream(wantAudio, wantVideo) {
    // 1. Configure audio constraints
    const audioConstraints = wantAudio ? {
      deviceId: this.activeDevices.microphone ? { exact: this.activeDevices.microphone } : undefined,
      echoCancellation: this.constraints.echoCancellation,
      noiseSuppression: this.constraints.noiseSuppression,
      autoGainControl: this.constraints.autoGainControl
    } : false;

    // 2. Configure video constraints (Resolution limits)
    const videoResolutionConstraints = {
      '360p': { width: 480, height: 360, frameRate: 15 },
      '720p': { width: 1280, height: 720, frameRate: 24 },
      '1080p': { width: 1920, height: 1080, frameRate: 30 }
    };
    const resConstraint = videoResolutionConstraints[this.videoResolution] || videoResolutionConstraints['720p'];

    const videoConstraints = wantVideo ? {
      deviceId: this.activeDevices.camera ? { exact: this.activeDevices.camera } : undefined,
      ...resConstraint,
      facingMode: 'user'
    } : false;

    // If both false, return
    if (!audioConstraints && !videoConstraints) {
      this.stopMediaStream();
      return;
    }

    // Capture standard camera/microphone media stream
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: videoConstraints
    });

    // Hot-swap tracks in active Peer Connections
    if (this.localStream) {
      // Mute state check on new audio track
      if (wantAudio) {
        const newAudioTrack = newStream.getAudioTracks()[0];
        if (newAudioTrack) {
          newAudioTrack.enabled = !this.muted;
          const oldAudioTrack = this.localStream.getAudioTracks()[0];
          
          if (oldAudioTrack) {
            this.localStream.removeTrack(oldAudioTrack);
            oldAudioTrack.stop();
          }
          this.localStream.addTrack(newAudioTrack);
          
          // Relay to peers
          this.peers.forEach(peer => peer.replaceTrack('audio', newAudioTrack));
        }
      }

      // Camera toggle/swap check
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = this.localStream.getVideoTracks()[0];

      if (wantVideo && newVideoTrack) {
        if (oldVideoTrack) {
          this.localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        this.localStream.addTrack(newVideoTrack);
        this.peers.forEach(peer => peer.replaceTrack('video', newVideoTrack));
      } else if (!wantVideo && oldVideoTrack) {
        this.localStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
        this.peers.forEach(peer => peer.replaceTrack('video', null));
      }
    } else {
      this.localStream = newStream;
      // Set mic initial mute state
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.muted;
      });
    }

    this.emitStateChange();
  }

  stopMediaStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  // Toggle Screen Sharing
  async startScreenShare() {
    if (this.callPermissions.screenShareAllowed === 'host' && !this.isHost()) {
      this.addError('Screen sharing restricted to Host only.', 'warning');
      return;
    }

    if (this.screenSharing) return;

    try {
      // Capture Screen Display stream
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: false // Do not capture system audio to prevent loops
      });

      this.screenStream = displayStream;
      this.screenSharing = true;
      this.emitStateChange();

      // Broadcast state to Socket.IO room
      if (this.socket) {
        this.socket.emit('screenShareState', { code: this.roomCode, sharing: true });
      }

      const screenTrack = displayStream.getVideoTracks()[0];

      // When user clicks "Stop Sharing" on the browser native bar, handle it
      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      // Hot-swap camera track with screen sharing track for all peers
      this.peers.forEach(peer => {
        peer.replaceTrack('video', screenTrack);
      });

      console.log('[CallEngine] Screen sharing active.');
    } catch (err) {
      console.error('[CallEngine] Screen share initialization failed:', err);
      this.screenSharing = false;
      this.emitStateChange();
      this.addError('Screen sharing cancelled/failed.', 'warning');
    }
  }

  stopScreenShare() {
    if (!this.screenSharing) return;

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    this.screenSharing = false;
    this.emitStateChange();

    if (this.socket) {
      this.socket.emit('screenShareState', { code: this.roomCode, sharing: false });
    }

    // Re-verify and restore webcam feed if it was previously enabled
    if (this.cameraActive) {
      this.setupMediaStream(true, true).then(() => {
        const cameraTrack = this.localStream ? this.localStream.getVideoTracks()[0] : null;
        this.peers.forEach(peer => peer.replaceTrack('video', cameraTrack));
      });
    } else {
      // Remove video track from connections
      this.peers.forEach(peer => peer.replaceTrack('video', null));
    }

    console.log('[CallEngine] Screen sharing stopped.');
  }

  // Device configuration settings changes
  async changeAudioDevice(deviceId) {
    this.activeDevices.microphone = deviceId;
    this.emitStateChange();
    
    if (this.callStatus === 'connected') {
      await this.setupMediaStream(true, this.cameraActive);
    }
  }

  async changeVideoDevice(deviceId) {
    this.activeDevices.camera = deviceId;
    this.emitStateChange();

    if (this.callStatus === 'connected' && this.cameraActive) {
      await this.setupMediaStream(this.localStream !== null, true);
    }
  }

  changeSpeakerDevice(deviceId) {
    this.activeDevices.speaker = deviceId;
    this.emitStateChange();
    
    // Changing output speaker requires binding sinkId to active HTMLAudioElements
    // We handle this via the video/audio tags in the React components by reading this setting.
  }

  async updateAudioConstraints(newConstraints) {
    this.constraints = { ...this.constraints, ...newConstraints };
    this.emitStateChange();

    if (this.callStatus === 'connected') {
      await this.setupMediaStream(true, this.cameraActive);
    }
  }

  async updateVideoResolution(resolution) {
    this.videoResolution = resolution;
    this.emitStateChange();

    if (this.callStatus === 'connected' && this.cameraActive) {
      await this.setupMediaStream(true, true);
    }
  }

  // Update Call Permissions (Host Only)
  changeCallPermissions(newPermissions) {
    if (!this.isHost()) return;
    
    const updated = { ...this.callPermissions, ...newPermissions };
    this.callPermissions = updated;
    this.emitStateChange();

    if (this.socket) {
      this.socket.emit('callStateChanged', { code: this.roomCode, permissions: updated });
    }
  }

  // Force stop screen share of another user (Host Only)
  forceStopUserScreenShare(targetSocketId) {
    if (!this.isHost()) return;
    if (this.socket) {
      this.socket.emit('forceStopScreenShare', { code: this.roomCode, targetSocketId });
    }
  }

  // Speaking Analyzer
  setSpeaking(isSpeaking) {
    this.speaking = isSpeaking;
    this.emitStateChange();

    if (this.socket) {
      this.socket.emit('speaking', { code: this.roomCode, speaking: isSpeaking });
    }
  }

  startAudioAnalysis() {
    if (!this.localStream) return;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      const source = this.audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(this.analyser);
      
      this.analyserInterval = setInterval(() => {
        if (!this.analyser || this.muted) {
          if (this.speaking) {
            this.setSpeaking(false);
          }
          return;
        }
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Dynamic threshold for speaking
        const threshold = 18;
        const isSpeaking = average > threshold;
        
        if (isSpeaking !== this.speaking) {
          this.setSpeaking(isSpeaking);
        }
      }, 200);
    } catch (err) {
      console.error('[CallEngine] Local audio analysis failed:', err);
    }
  }

  stopAudioAnalysis() {
    if (this.analyserInterval) {
      clearInterval(this.analyserInterval);
      this.analyserInterval = null;
    }
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      this.audioContext = null;
    }
    this.analyser = null;
  }
}
