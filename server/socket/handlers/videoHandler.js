import { SOCKET_EVENTS } from '../events.js';
import Realm from '../../models/Realm.js';
import { findRealmByQuery } from '../../controllers/realmController.js';

// Helper to check if user has host permissions (owner or admin)
const hasHostPermissions = (realm, userId) => {
  if (!realm || !userId) return false;
  const ownerStr = realm.owner ? realm.owner.toString() : (realm.ownerId ? realm.ownerId.toString() : '');
  const isOwner = ownerStr === userId.toString();
  const isAdmin = realm.admins ? realm.admins.some(a => a.toString() === userId.toString()) : false;
  return isOwner || isAdmin;
};

export const registerVideoHandlers = (io, socket) => {

  // 1. play event
  socket.on(SOCKET_EVENTS.PLAY, async ({ code, currentTime }) => {
    try {
      if (!code) return;
      const cleanCode = code.toUpperCase().trim();
      const realm = await findRealmByQuery({ code: cleanCode });

      if (realm) {
        if (!realm.playbackState) realm.playbackState = {};
        realm.playbackState.isPlaying = true;
        realm.playbackState.currentTime = currentTime;
        realm.playbackState.lastUpdated = new Date();

        if (typeof realm.save === 'function') {
          try { await realm.save(); } catch (_) {}
        }
      }

      // Broadcast play event to all clients in room
      io.to(cleanCode).emit(SOCKET_EVENTS.PLAY, { currentTime });
      console.log(`[Socket] Room ${cleanCode} Play at ${currentTime}`);
    } catch (err) {
      console.error('Error in play socket handler:', err);
    }
  });

  // 2. pause event
  socket.on(SOCKET_EVENTS.PAUSE, async ({ code, currentTime }) => {
    try {
      if (!code) return;
      const cleanCode = code.toUpperCase().trim();
      const realm = await findRealmByQuery({ code: cleanCode });

      if (realm) {
        if (!realm.playbackState) realm.playbackState = {};
        realm.playbackState.isPlaying = false;
        realm.playbackState.currentTime = currentTime;
        realm.playbackState.lastUpdated = new Date();

        if (typeof realm.save === 'function') {
          try { await realm.save(); } catch (_) {}
        }
      }

      // Broadcast pause event to all clients in room
      io.to(cleanCode).emit(SOCKET_EVENTS.PAUSE, { currentTime });
      console.log(`[Socket] Room ${cleanCode} Pause at ${currentTime}`);
    } catch (err) {
      console.error('Error in pause socket handler:', err);
    }
  });

  // 3. seek event
  socket.on(SOCKET_EVENTS.SEEK, async ({ code, currentTime }) => {
    try {
      if (!code) return;
      const cleanCode = code.toUpperCase().trim();
      const realm = await findRealmByQuery({ code: cleanCode });

      if (realm) {
        if (!realm.playbackState) realm.playbackState = {};
        realm.playbackState.currentTime = currentTime;
        realm.playbackState.lastUpdated = new Date();

        if (typeof realm.save === 'function') {
          try { await realm.save(); } catch (_) {}
        }
      }

      // Broadcast seek event to all clients in room
      io.to(cleanCode).emit(SOCKET_EVENTS.SEEK, { currentTime });
      console.log(`[Socket] Room ${cleanCode} Seek to ${currentTime}`);
    } catch (err) {
      console.error('Error in seek socket handler:', err);
    }
  });

  // 4. playbackRateChanged event
  socket.on('playbackRateChanged', async ({ code, playbackRate }) => {
    try {
      if (!code) return;
      const cleanCode = code.toUpperCase().trim();
      const realm = await findRealmByQuery({ code: cleanCode });

      if (realm) {
        if (!realm.playbackState) realm.playbackState = {};
        realm.playbackState.playbackRate = playbackRate;
        realm.playbackState.lastUpdated = new Date();

        if (typeof realm.save === 'function') {
          try { await realm.save(); } catch (_) {}
        }
      }

      // Broadcast rate change to all clients in room
      io.to(cleanCode).emit('playbackRateChanged', { playbackRate });
      console.log(`[Socket] Room ${cleanCode} Playback speed set to ${playbackRate}`);
    } catch (err) {
      console.error('Error in playbackRateChanged handler:', err);
    }
  });

  // 5. queueUpdated event
  socket.on('queueUpdated', async ({ code, queue }) => {
    try {
      if (!code) return;
      const cleanCode = code.toUpperCase().trim();
      const realm = await findRealmByQuery({ code: cleanCode });

      if (realm) {
        realm.queue = queue;
        if (typeof realm.save === 'function') {
          try { await realm.save(); } catch (_) {}
        }
      }

      io.to(cleanCode).emit('queueUpdated', { queue });
      console.log(`[Socket] Room ${cleanCode} Queue updated`);
    } catch (err) {
      console.error('Error in queueUpdated handler:', err);
    }
  });

  // 5. videoChanged event (when host loads a new link)
  socket.on(SOCKET_EVENTS.VIDEO_CHANGED, async ({ code, video }) => {
    try {
      if (!socket.user) return;
      const cleanCode = code.toUpperCase().trim();
      const realm = await findRealmByQuery({ code: cleanCode });

      if (!realm || !hasHostPermissions(realm, socket.user.id)) {
        console.warn(`[Socket] Unauthorized videoChange attempt by ${socket.user.username}`);
        return;
      }

      // Save previous video to history
      if (!realm.history) realm.history = [];
      if (realm.currentVideo && realm.currentVideo.videoId) {
        realm.history = realm.history.filter(h => h.videoId !== realm.currentVideo.videoId);
        realm.history.unshift(realm.currentVideo);
        realm.history = realm.history.slice(0, 15);
      }

      // Update current video and reset state
      realm.currentVideo = video;
      realm.playbackState = {
        videoId: video.videoId,
        isPlaying: false,
        currentTime: 0,
        playbackRate: 1.0,
        hostId: socket.user.id,
        lastUpdated: new Date()
      };

      if (typeof realm.save === 'function') {
        try { await realm.save(); } catch (_) {}
      }

      // Broadcast load video event to all participants
      io.to(cleanCode).emit(SOCKET_EVENTS.VIDEO_CHANGED, { video });
      console.log(`[Socket] Room ${cleanCode} Video changed to: ${video.title}`);
    } catch (err) {
      console.error('Error in videoChanged socket handler:', err);
    }
  });

  // 6. syncRequest (Late Join Sync)
  socket.on('syncRequest', async ({ code }) => {
    try {
      if (!socket.user) return;
      const cleanCode = code.toUpperCase().trim();
      const realm = await findRealmByQuery({ code: cleanCode });

      if (!realm) return;

      const state = realm.playbackState || { isPlaying: false, currentTime: 0, playbackRate: 1.0 };
      
      // Calculate elapsed offset time if playing
      let timeElapsed = 0;
      if (state.isPlaying && state.lastUpdated) {
        timeElapsed = (Date.now() - new Date(state.lastUpdated).getTime()) / 1000;
      }

      // Emit response directly back to requesting socket client only
      socket.emit('syncResponse', {
        videoId: realm.currentVideo?.videoId || state.videoId,
        isPlaying: state.isPlaying,
        currentTime: (state.currentTime || 0) + timeElapsed,
        playbackRate: state.playbackRate || 1.0,
        hostId: state.hostId
      });
      
      console.log(`[Socket] Served syncRequest for ${socket.user.username} in Room ${cleanCode}`);
    } catch (err) {
      console.error('Error in syncRequest socket handler:', err);
    }
  });

  // 7. videoEnded event
  socket.on(SOCKET_EVENTS.VIDEO_ENDED, async ({ code }) => {
    try {
      if (!socket.user) return;
      const cleanCode = code.toUpperCase().trim();
      const realm = await findRealmByQuery({ code: cleanCode });

      if (!realm || !hasHostPermissions(realm, socket.user.id)) return;

      if (realm.queue && realm.queue.length > 0) {
        const nextVideo = realm.queue.shift();
        
        const convertedVideo = {
          title: nextVideo.title,
          duration: nextVideo.duration,
          videoId: nextVideo.videoId,
          thumbnailUrl: nextVideo.thumbnailUrl,
          channelTitle: nextVideo.channelTitle,
          provider: nextVideo.provider,
          views: 'Next Up',
          uploadDate: 'Automatically advanced'
        };

        if (!realm.history) realm.history = [];
        if (realm.currentVideo && realm.currentVideo.videoId) {
          realm.history = realm.history.filter(h => h.videoId !== realm.currentVideo.videoId);
          realm.history.unshift(realm.currentVideo);
        }

        realm.currentVideo = convertedVideo;
        realm.playbackState = {
          videoId: convertedVideo.videoId,
          isPlaying: true,
          currentTime: 0,
          playbackRate: 1.0,
          hostId: socket.user.id,
          lastUpdated: new Date()
        };

        if (typeof realm.save === 'function') {
          try { await realm.save(); } catch (_) {}
        }

        io.to(cleanCode).emit(SOCKET_EVENTS.VIDEO_CHANGED, { video: convertedVideo });
        io.to(cleanCode).emit(SOCKET_EVENTS.PLAY, { currentTime: 0 });
        console.log(`[Socket] Room ${cleanCode} Advanced to next queue item: ${convertedVideo.title}`);
      }
    } catch (err) {
      console.error('Error in videoEnded socket handler:', err);
    }
  });
};
