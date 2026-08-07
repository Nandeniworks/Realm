import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, Film, Lock, ShieldCheck, AlertCircle, SkipForward } from 'lucide-react';
import MediaProvider from './media/MediaProvider';
import { useRealm } from '../contexts/RealmContext';
import { useAuth } from '../contexts/AuthContext';

export default function VideoPlaceholder({ 
  title: initialTitle, 
  duration: initialDuration,
  playerRef: externalPlayerRef,
  activeReaction,
  onClearReaction
}) {
  const { currentRealm } = useRealm();
  const { currentUser } = useAuth();
  const code = currentRealm?.code;

  // Resolve Host / Controller Permissions using User ID checks & room settings
  const requesterUserId = currentUser?._id || currentUser?.uid || currentUser?.id;
  const isHost = currentRealm?.allowPlaybackControl ||
                  (requesterUserId && (
                    currentRealm?.owner?.toString() === requesterUserId?.toString() || 
                    currentRealm?.ownerId?.toString() === requesterUserId?.toString() ||
                    currentRealm?.admins?.some(a => a.toString() === requesterUserId?.toString())
                  ));

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [playerError, setPlayerError] = useState(null);

  // Floating Overlay Particles State
  const [overlayParticles, setOverlayParticles] = useState([]);

  const ytPlayerRef = useRef(null);

  // Trigger floating particles overlay when activeReaction changes from parent Socket broadcast
  useEffect(() => {
    if (activeReaction && activeReaction.emoji) {
      spawnOverlayParticles(activeReaction.emoji);
      if (onClearReaction) onClearReaction();
    }
  }, [activeReaction]);

  // Spawn floating emojis
  const spawnOverlayParticles = (emoji) => {
    const id = Date.now();
    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      id: `${id}-${i}`,
      char: emoji,
      startX: 20 + Math.random() * 60,
      startY: 90,
      xOffset: (Math.random() * 200) - 100,
      yOffset: -180 - Math.random() * 150,
      scale: 0.6 + Math.random() * 0.7,
      duration: 1.5 + Math.random() * 1.5,
      delay: Math.random() * 0.3,
      rotate: (Math.random() * 90) - 45
    }));

    setOverlayParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => {
      setOverlayParticles((prev) => prev.filter(p => !p.id.startsWith(id.toString())));
    }, 3500);
  };

  // Sync Duration when API triggers ready
  const handleReady = (player) => {
    setPlayerReady(true);
    setPlayerError(null);
    if (ytPlayerRef.current?.getDuration) {
      setDuration(Math.round(ytPlayerRef.current.getDuration()));
    }

    // Auto Late Join Synchronization Request
    if (window.realmSocket && code) {
      console.log('[Sync Engine] Player ready. Emitting syncRequest...');
      window.realmSocket.emit('syncRequest', { code });
    }
  };

  const handlePlayerError = (errorCode) => {
    console.error('[YouTube Error] Event fired with code:', errorCode);
    let message = 'An error occurred while loading this video stream.';
    if (errorCode === 2) {
      message = 'Invalid YouTube link. Please check the URL format.';
    } else if (errorCode === 5) {
      message = 'HTML5 playback error. This video cannot be played here.';
    } else if (errorCode === 100) {
      message = 'Video not found. It may be private or deleted.';
    } else if (errorCode === 101 || errorCode === 150) {
      message = 'Playback restricted. Embedding has been disabled for this video.';
    }
    setPlayerError(message);
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sync internal progress timer
  useEffect(() => {
    let timer;
    if (isPlaying && playerReady) {
      timer = setInterval(() => {
        if (ytPlayerRef.current?.getCurrentTime) {
          const curr = ytPlayerRef.current.getCurrentTime();
          setCurrentTime(curr);
          if (duration > 0) {
            setProgress((curr / duration) * 100);
          }
        }
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playerReady, duration]);

  // Bind parent methods for WebSocket synchronizations
  useEffect(() => {
    if (externalPlayerRef) {
      externalPlayerRef.current = {
        syncPlay: (time) => {
          setIsPlaying(true);
          if (ytPlayerRef.current?.play) {
            ytPlayerRef.current.play();
            if (time !== undefined) {
              ytPlayerRef.current.seekTo(time);
              setCurrentTime(time);
            }
          }
        },
        syncPause: (time) => {
          setIsPlaying(false);
          if (ytPlayerRef.current?.pause) {
            ytPlayerRef.current.pause();
            if (time !== undefined) {
              ytPlayerRef.current.seekTo(time);
              setCurrentTime(time);
            }
          }
        },
        syncSeek: (time) => {
          if (ytPlayerRef.current?.seekTo) {
            ytPlayerRef.current.seekTo(time);
            setCurrentTime(time);
            if (duration > 0) setProgress((time / duration) * 100);
          }
        },
        syncPlaybackRate: (rate) => {
          setPlaybackRate(rate);
          if (ytPlayerRef.current?.setPlaybackRate) {
            ytPlayerRef.current.setPlaybackRate(rate);
          }
        },
        syncState: ({ currentTime: hostTime, isPlaying: hostPlaying, playbackRate: hostRate }) => {
          if (!ytPlayerRef.current) return;
          
          // Drift check: correction occurs if playheads differ by > 1.0s
          const localTime = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : currentTime;
          const diff = Math.abs(localTime - hostTime);
          
          if (diff > 1.0) {
            console.log(`[Sync Engine] Drift detected (${diff.toFixed(2)}s). Seeking to: ${hostTime}`);
            ytPlayerRef.current.seekTo(hostTime);
            setCurrentTime(hostTime);
            if (duration > 0) setProgress((hostTime / duration) * 100);
          }

          // Speed sync
          if (hostRate !== undefined && Math.abs(playbackRate - hostRate) > 0.01) {
            setPlaybackRate(hostRate);
            if (ytPlayerRef.current?.setPlaybackRate) {
              ytPlayerRef.current.setPlaybackRate(hostRate);
            }
          }

          // Playback sync
          if (hostPlaying && !isPlaying) {
            setIsPlaying(true);
            ytPlayerRef.current.play();
          } else if (!hostPlaying && isPlaying) {
            setIsPlaying(false);
            ytPlayerRef.current.pause();
          }
        }
      };
    }
  }, [externalPlayerRef, isPlaying, currentTime, duration, playerReady, playbackRate]);

  // UI Event Handlers
  const handlePlayToggle = () => {
    if (!isHost) return;
    
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    const time = ytPlayerRef.current?.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : currentTime;

    if (nextState) {
      ytPlayerRef.current?.play();
      if (window.realmSocket) {
        window.realmSocket.emit('play', { code, currentTime: time });
      }
    } else {
      ytPlayerRef.current?.pause();
      if (window.realmSocket) {
        window.realmSocket.emit('pause', { code, currentTime: time });
      }
    }
  };

  const handleSeekChange = (e) => {
    if (!isHost) return;
    
    const val = parseFloat(e.target.value);
    const targetSeconds = (val / 100) * duration;
    
    setProgress(val);
    setCurrentTime(targetSeconds);
    
    if (ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(targetSeconds);
      if (window.realmSocket) {
        window.realmSocket.emit('seek', { code, currentTime: targetSeconds });
      }
    }
  };

  const handlePlaybackRateChange = (rate) => {
    if (!isHost) return;
    setPlaybackRate(rate);
    if (ytPlayerRef.current?.setPlaybackRate) {
      ytPlayerRef.current.setPlaybackRate(rate);
    }
    if (window.realmSocket) {
      window.realmSocket.emit('playbackRateChanged', { code, playbackRate: rate });
    }
  };

  const handleEnded = () => {
    if (isHost && window.realmSocket) {
      window.realmSocket.emit('videoEnded', { code });
    }
  };

  // Sync state broadcast loop (from host every 2.5 seconds for tight drift correction)
  useEffect(() => {
    if (!isHost || !playerReady || !window.realmSocket) return;

    const interval = setInterval(() => {
      if (ytPlayerRef.current?.getCurrentTime) {
        const time = ytPlayerRef.current.getCurrentTime();
        window.realmSocket.emit('syncState', {
          code,
          currentTime: time,
          isPlaying,
          playbackRate
        });
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isHost, isPlaying, playerReady, code, playbackRate]);

  // Expose local spawn helper to the window
  useEffect(() => {
    window.spawnReactionOverlay = spawnOverlayParticles;
    return () => {
      window.spawnReactionOverlay = null;
    };
  }, []);

  const activeVideo = currentRealm?.currentVideo || {
    title: initialTitle || 'Spirited Away',
    duration: initialDuration || '2h 5m',
    videoId: 'ByXuk9QqQkk',
    thumbnailUrl: 'https://img.youtube.com/vi/ByXuk9QqQkk/0.jpg',
    channelTitle: 'Madman Anime',
    provider: 'youtube',
    views: '12M views',
    uploadDate: 'Released 2001'
  };

  return (
    <div className="space-y-4">
      {/* Video Container Aspect Box */}
      <div className="relative w-full aspect-video rounded-3xl overflow-hidden glass-panel border border-realm-lavender/10 shadow-[0_20px_45px_rgba(4,6,16,0.6)] group bg-black">
        
        {/* Real-time Emoji Reactions Floating Overlay */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {overlayParticles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: `${p.startX}%`, y: `${p.startY}%`, scale: 0.5, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: `${p.startY + (p.yOffset / 4)}%`,
                  x: `${p.startX + (p.xOffset / 8)}%`,
                  scale: [0.5, p.scale, p.scale, 0.4],
                  rotate: p.rotate
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: p.duration, ease: 'easeOut', delay: p.delay }}
                className="absolute text-3xl filter drop-shadow-[0_4px_10px_rgba(4,6,16,0.4)]"
              >
                {p.char}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Loading Skeleton */}
        {!playerReady && !playerError && (
          <div className="absolute inset-0 bg-[#080a15] flex flex-col items-center justify-center space-y-4 z-30">
            <Film className="w-12 h-12 text-realm-lavender/30 animate-pulse" />
            <span className="text-xs text-realm-moon-muted">Connecting movie stream channels...</span>
          </div>
        )}

        {/* Dynamic Player Error Screen */}
        {playerError && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center space-y-4 z-40 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-realm-pink" />
            <span className="text-xs font-semibold text-realm-pink">{playerError}</span>
            <button
              onClick={() => {
                setPlayerError(null);
                setPlayerReady(false);
                if (ytPlayerRef.current?.loadVideoById) {
                  ytPlayerRef.current.loadVideoById(activeVideo.videoId);
                }
              }}
              className="px-4 py-2 bg-realm-lavender text-realm-navy-dark text-xs font-bold rounded-xl hover:bg-white transition-all cursor-pointer"
            >
              Retry Video Stream
            </button>
          </div>
        )}

        {/* Media Abstraction Wrapper */}
        <MediaProvider
          provider={activeVideo.provider}
          videoId={activeVideo.videoId}
          onReady={handleReady}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
          onError={handlePlayerError}
          playerRef={ytPlayerRef}
        />

        {/* Control overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col space-y-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          
          {/* Progress bar scrub slider */}
          <div className="flex items-center space-x-3 w-full">
            <span className="text-[10px] font-mono text-realm-moon font-medium">
              {formatTime(currentTime)}
            </span>
            
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSeekChange}
              disabled={!isHost}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-realm-lavender focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <span className="text-[10px] font-mono text-realm-moon-muted">
              {formatTime(duration || 120)}
            </span>
          </div>

          {/* Buttons controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePlayToggle}
                disabled={!isHost}
                className="text-realm-moon hover:text-realm-lavender transition-colors p-1 disabled:opacity-50"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              {isHost && (
                <button
                  onClick={handleEnded}
                  className="text-realm-moon hover:text-realm-lavender transition-colors p-1"
                  title="Skip to Next Video"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (ytPlayerRef.current?.setVolume) {
                    ytPlayerRef.current.setVolume(isMuted ? 80 : 0);
                  }
                }}
                className="text-realm-moon hover:text-realm-lavender transition-colors p-1"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <span className="text-[10px] text-realm-moon-muted flex items-center space-x-1.5 bg-realm-navy-dark/60 border border-realm-lavender/10 px-2 py-0.5 rounded-full">
                {isHost ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-realm-gold" />
                    <span>Host Controls Active</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-realm-pink" />
                    <span>Playback Locked by Host</span>
                  </>
                )}
              </span>

              {/* Host playback speed controller */}
              {isHost && (
                <select
                  value={playbackRate}
                  onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                  className="bg-realm-navy-dark/80 text-realm-moon border border-realm-lavender/15 text-[10px] rounded-lg px-2 py-0.5 outline-none cursor-pointer hover:border-realm-lavender/40 transition-all font-semibold"
                >
                  <option value="0.25">0.25x</option>
                  <option value="0.5">0.5x</option>
                  <option value="1">1.0x (Normal)</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2.0x</option>
                </select>
              )}
            </div>

            <span className="text-xs font-semibold text-realm-moon truncate max-w-[200px]">
              {activeVideo.title}
            </span>

            <button
              onClick={() => alert("Full-screen mode")}
              className="text-realm-moon hover:text-realm-lavender transition-colors p-1"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* Current Movie Metadata Card */}
      <div className="flex items-start space-x-4 p-4 rounded-3xl border border-realm-lavender/5 bg-realm-navy-card/40 backdrop-blur-xs">
        <div className="w-24 h-16 rounded-xl bg-black overflow-hidden relative border border-realm-lavender/5 shrink-0">
          {activeVideo.thumbnailUrl ? (
            <img src={activeVideo.thumbnailUrl} alt={activeVideo.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-realm-navy-light to-realm-lavender/10 flex items-center justify-center">
              <Film className="w-6 h-6 text-realm-lavender/20" />
            </div>
          )}
        </div>

        <div className="flex flex-col text-left justify-center flex-1 min-w-0">
          <h3 className="text-sm font-bold text-realm-moon leading-tight truncate">
            {activeVideo.title}
          </h3>
          <span className="text-[11px] text-realm-lavender font-medium mt-1">
            {activeVideo.channelTitle}
          </span>
          <div className="flex items-center space-x-2 text-[10px] text-realm-moon-muted mt-0.5">
            <span>{activeVideo.views || 'No Views'}</span>
            <span>•</span>
            <span>{activeVideo.uploadDate || 'Release Date Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
