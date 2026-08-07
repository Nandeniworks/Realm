import { getIceServers } from '../webrtc/iceConfig.js';

export class Peer {
  constructor(socketId, isInitiator, localStream, onSignal, onStream, onDisconnect) {
    this.socketId = socketId;
    this.isInitiator = isInitiator;
    this.localStream = localStream;
    this.onSignal = onSignal;
    this.onStream = onStream;
    this.onDisconnect = onDisconnect;
    this.remoteStream = null;
    this.peerConnection = null;
    this.pendingCandidates = [];
    
    this.init();
  }

  init() {
    // Create RTCPeerConnection with STUN + (if configured) TURN servers
    this.peerConnection = new RTCPeerConnection({
      iceServers: getIceServers()
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal({
          type: 'candidate',
          candidate: event.candidate
        });
      }
    };

    // Handle remote streams
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onStream(this.remoteStream);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log(`[Peer Connection State] to ${this.socketId}: ${this.peerConnection.connectionState}`);
      if (this.peerConnection.connectionState === 'failed') {
        // Attempt ICE restart reconnect
        console.warn(`[Peer] Connection failed for ${this.socketId}, attempting ICE restart...`);
        this.restartIce();
      } else if (
        this.peerConnection.connectionState === 'disconnected' ||
        this.peerConnection.connectionState === 'closed'
      ) {
        this.onDisconnect();
      }
    };

    // Handle track additions mid-call
    this.peerConnection.onnegotiationneeded = async () => {
      try {
        if (this.peerConnection.signalingState === 'stable') {
          await this.createOffer();
        }
      } catch (err) {
        console.warn('[Peer] Negotiation error:', err);
      }
    };

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // If initiator, create and send an offer
    if (this.isInitiator) {
      this.createOffer();
    }
  }

  async restartIce() {
    if (!this.peerConnection) return;
    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      this.onSignal({
        type: 'offer',
        sdp: offer
      });
    } catch (err) {
      console.error(`[Peer] Error during ICE restart for ${this.socketId}:`, err);
      this.onDisconnect();
    }
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.onSignal({
        type: 'offer',
        sdp: offer
      });
    } catch (err) {
      console.error(`[Peer] Error creating offer to ${this.socketId}:`, err);
    }
  }

  async handleSignal(signal) {
    if (!this.peerConnection) return;
    
    try {
      if (signal.type === 'offer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await this.processPendingCandidates();
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.onSignal({
          type: 'answer',
          sdp: answer
        });
      } else if (signal.type === 'answer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await this.processPendingCandidates();
      } else if (signal.type === 'candidate') {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
          await this.peerConnection.addIceCandidate(candidate);
        } else {
          this.pendingCandidates.push(candidate);
        }
      }
    } catch (err) {
      console.error(`[Peer] Error handling signal from ${this.socketId}:`, err);
    }
  }

  async processPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(candidate);
      } catch (err) {
        console.warn(`[Peer] Buffered candidate add error:`, err);
      }
    }
  }

  // Hot swap media tracks (e.g. mic mute/unmute, screen share)
  replaceTrack(oldTrackKind, newTrack) {
    if (!this.peerConnection) return;
    
    const senders = this.peerConnection.getSenders();
    const sender = senders.find(s => s.track && s.track.kind === oldTrackKind);
    
    if (sender) {
      if (newTrack) {
        sender.replaceTrack(newTrack);
      } else {
        // If track is null, we can replace it with null to disable/stop streaming it
        sender.replaceTrack(null);
      }
    } else if (newTrack) {
      // If we didn't have a track sender of this kind, add it
      this.peerConnection.addTrack(newTrack, this.localStream);
    }
  }

  destroy() {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
  }
}
