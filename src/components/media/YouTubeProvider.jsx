import React, { useEffect, useRef } from 'react';

export default function YouTubeProvider({ 
  videoId, 
  onReady, 
  onStateChange, 
  onPlay, 
  onPause, 
  onEnded, 
  onError,
  playerRef 
}) {
  const containerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const elementId = useRef(`yt-player-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // 1. Dynamic script tag loader for official YouTube IFrame API
    if (!window.YT) {
      // Check if tag already exists to avoid duplicate script tags
      const existingTag = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingTag) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      // Bind global callback
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        initializePlayer();
      };
    } else {
      initializePlayer();
    }

    function initializePlayer() {
      // Avoid re-initialization if already created
      if (playerInstanceRef.current) return;

      console.log(`[YouTube Provider] Instantiating Player for ID: ${videoId}`);
      playerInstanceRef.current = new window.YT.Player(elementId.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          controls: 0,        // Hide default controls to preserve glass overlay cinema styling
          disablekb: 1,       // Disable keyboard controls
          fs: 0,              // Disable fullscreen button
          modestbranding: 1,  // Hide logo
          rel: 0,             // Do not show related videos
          showinfo: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event) => {
            // Assign instance handle back to parent for imperative calls (seek, pause, play)
            if (playerRef) {
              playerRef.current = {
                play: () => event.target.playVideo(),
                pause: () => event.target.pauseVideo(),
                seekTo: (seconds) => event.target.seekTo(seconds, true),
                getCurrentTime: () => event.target.getCurrentTime(),
                getDuration: () => event.target.getDuration(),
                setPlaybackRate: (rate) => event.target.setPlaybackRate(rate),
                loadVideoById: (id) => event.target.loadVideoById(id),
                setVolume: (vol) => event.target.setVolume(vol),
              };
            }
            if (onReady) onReady(event.target);
          },
          onStateChange: (event) => {
            const state = event.data;
            if (onStateChange) onStateChange(state);

            if (state === window.YT.PlayerState.PLAYING && onPlay) {
              onPlay(event.target.getCurrentTime());
            } else if (state === window.YT.PlayerState.PAUSED && onPause) {
              onPause(event.target.getCurrentTime());
            } else if (state === window.YT.PlayerState.ENDED && onEnded) {
              onEnded();
            }
          },
          onError: (event) => {
            if (onError) onError(event.data);
          }
        }
      });
    }

    return () => {
      // Clean up player on unmount
      if (playerInstanceRef.current && typeof playerInstanceRef.current.destroy === 'function') {
        console.log('[YouTube Provider] Destroying player instance');
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }
    };
  }, [videoId]);

  // Keep player in sync if videoId changes on existing mount
  useEffect(() => {
    if (playerInstanceRef.current && typeof playerInstanceRef.current.loadVideoById === 'function') {
      playerInstanceRef.current.loadVideoById(videoId);
    }
  }, [videoId]);

  return (
    <div className="w-full h-full pointer-events-none">
      <div id={elementId.current} ref={containerRef} className="w-full h-full" />
    </div>
  );
}
export { YouTubeProvider };
