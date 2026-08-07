import React, { useEffect, useRef, useState } from 'react';
import { getStreamUrl, getTranscodeStreamUrl } from '../../utils/jellyfinApi';

/**
 * Renders a Jellyfin-hosted video via a plain HTML5 <video> element.
 * `videoId` here is a Jellyfin item ID (not a YouTube ID).
 *
 * The Jellyfin connection (server URL + access token) is read from
 * localStorage under `realm_jellyfin_connection` — set this after a
 * successful `connectJellyfin()` call. This keeps the provider
 * self-contained without threading connection state through every
 * component that might render a video.
 */
function getStoredConnection() {
  try {
    const raw = localStorage.getItem('realm_jellyfin_connection');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function JellyfinProvider({
  videoId,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  playerRef
}) {
  const videoRef = useRef(null);
  const [connection] = useState(getStoredConnection);
  const [useTranscode, setUseTranscode] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (!connection) {
      setConnectionError(true);
      if (onError) onError('not_connected');
    }
  }, [connection]);

  // Expose imperative controls matching the YouTubeProvider interface, so
  // RealmPage's sync logic (play/pause/seek/rate) works unmodified.
  useEffect(() => {
    if (!playerRef) return;
    playerRef.current = {
      play: () => videoRef.current?.play().catch(() => {}),
      pause: () => videoRef.current?.pause(),
      seekTo: (seconds) => {
        if (videoRef.current) videoRef.current.currentTime = seconds;
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      getDuration: () => videoRef.current?.duration || 0,
      setPlaybackRate: (rate) => {
        if (videoRef.current) videoRef.current.playbackRate = rate;
      },
      setVolume: (vol) => {
        // YouTube's setVolume uses a 0-100 scale; HTML5 video uses 0-1.
        if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, vol / 100));
      },
      // videoId change is handled by the `src` effect below; this just
      // matches the YouTube provider's imperative-load API shape.
      loadVideoById: () => {}
    };
  }, [playerRef]);

  if (connectionError) {
    return (
      <div className="w-full h-full bg-realm-navy-dark flex flex-col items-center justify-center gap-2 text-realm-moon-muted text-sm px-6 text-center">
        <span>Not connected to a Jellyfin server.</span>
        <span className="text-xs opacity-70">
          Connect your Jellyfin server from Settings, then try again.
        </span>
      </div>
    );
  }

  const streamUrl = useTranscode
    ? getTranscodeStreamUrl(videoId, connection)
    : getStreamUrl(videoId, connection);

  return (
    <video
      key={`${videoId}-${useTranscode}`}
      ref={videoRef}
      src={streamUrl}
      className="w-full h-full bg-black"
      playsInline
      onLoadedMetadata={() => onReady && onReady(videoRef.current)}
      onPlay={() => onPlay && onPlay(videoRef.current?.currentTime || 0)}
      onPause={() => onPause && onPause(videoRef.current?.currentTime || 0)}
      onEnded={() => onEnded && onEnded()}
      onError={() => {
        // Direct-play failed (likely an unsupported codec) — fall back to
        // server-side transcoding once, then give up and surface the error.
        if (!useTranscode) {
          setUseTranscode(true);
        } else if (onError) {
          onError('playback_failed');
        }
      }}
    />
  );
}

export { JellyfinProvider };
