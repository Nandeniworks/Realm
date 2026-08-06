import React from 'react';
import YouTubeProvider from './YouTubeProvider';
import JellyfinProvider from './JellyfinProvider';

/**
 * MediaProvider abstraction layer.
 * Selects the correct video player provider dynamically based on metadata,
 * ensuring the rest of the application remains decoupled from YouTube specifics.
 */
export default function MediaProvider({ 
  provider = 'youtube', 
  videoId, 
  onReady, 
  onStateChange, 
  onPlay, 
  onPause, 
  onEnded, 
  onError,
  playerRef 
}) {
  switch (provider.toLowerCase()) {
    case 'youtube':
      return (
        <YouTubeProvider
          videoId={videoId}
          onReady={onReady}
          onStateChange={onStateChange}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onError={onError}
          playerRef={playerRef}
        />
      );
    case 'jellyfin':
      return (
        <JellyfinProvider
          videoId={videoId}
          onReady={onReady}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onError={onError}
          playerRef={playerRef}
        />
      );
    // Future expansion slots (Vimeo, Dailymotion, Local Files, etc.)
    // case 'vimeo':
    //   return <VimeoProvider {...props} />;
    default:
      return (
        <div className="w-full h-full bg-realm-navy-dark flex items-center justify-center text-realm-moon-muted text-sm">
          Unsupported Media Provider: {provider}
        </div>
      );
  }
}
