// Jellyfin API Client Utility
//
// Unlike youtubeApi.js (which calls Google's public API with a shared API
// key), Jellyfin is self-hosted: every user points this at *their own*
// server. Calls go straight from the browser to that server — not through
// our Node backend — because a self-hosted Jellyfin instance (home network,
// behind a router, maybe on Tailscale) is usually reachable by the user's own
// devices but not by wherever our backend happens to be running. The
// connection (server URL + access token) is persisted via the existing
// PATCH /social/profile endpoint under `preferences.jellyfin`, so it's saved
// per-user and travels with the account across devices.

const CLIENT_HEADERS = {
  'X-Emby-Authorization':
    'MediaBrowser Client="RealmWatchParty", Device="Browser", DeviceId="realm-webapp", Version="1.0.0"'
};

const normalizeServerUrl = (url) => url.trim().replace(/\/+$/, '');

/**
 * Authenticate against a Jellyfin server with a username/password.
 * Returns { serverUrl, accessToken, userId, username } on success — persist
 * this (e.g. into user preferences) so future calls don't need to re-auth.
 */
export const connectJellyfin = async (serverUrl, username, password) => {
  const base = normalizeServerUrl(serverUrl);

  let response;
  try {
    response = await fetch(`${base}/Users/AuthenticateByName`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...CLIENT_HEADERS
      },
      body: JSON.stringify({ Username: username, Pw: password })
    });
  } catch (err) {
    throw new Error(
      `Could not reach Jellyfin server at ${base}. Check the URL and that it's reachable from this device/network.`
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Incorrect Jellyfin username or password.');
    }
    throw new Error(`Jellyfin server responded with an error (${response.status}).`);
  }

  const data = await response.json();
  return {
    serverUrl: base,
    accessToken: data.AccessToken,
    userId: data.User?.Id,
    username: data.User?.Name || username
  };
};

const formatDuration = (runTimeTicks) => {
  if (!runTimeTicks) return '';
  const totalSeconds = Math.floor(runTimeTicks / 10_000_000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const mapItemToQueueEntry = (item, connection) => ({
  videoId: item.Id,
  title: item.Name,
  duration: formatDuration(item.RunTimeTicks),
  thumbnailUrl: getJellyfinImageUrl(item.Id, connection),
  channelTitle: item.SeriesName || (item.ProductionYear ? `${item.ProductionYear}` : 'Jellyfin'),
  provider: 'jellyfin',
  views: item.Type || 'Media',
  uploadDate: item.PremiereDate ? new Date(item.PremiereDate).getFullYear().toString() : ''
});

/**
 * Search the connected Jellyfin server's library for movies/episodes/series.
 * `connection` = { serverUrl, accessToken, userId }
 */
export const searchJellyfin = async (query, connection) => {
  if (!connection?.serverUrl || !connection?.accessToken || !connection?.userId) {
    throw new Error('Not connected to a Jellyfin server yet.');
  }
  if (!query || !query.trim()) return [];

  const params = new URLSearchParams({
    searchTerm: query,
    IncludeItemTypes: 'Movie,Series,Episode',
    Recursive: 'true',
    Limit: '24',
    Fields: 'Overview,ProductionYear'
  });

  const response = await fetch(
    `${connection.serverUrl}/Users/${connection.userId}/Items?${params.toString()}`,
    { headers: { 'X-Emby-Token': connection.accessToken, ...CLIENT_HEADERS } }
  );

  if (!response.ok) {
    throw new Error(`Jellyfin search failed (${response.status}).`);
  }

  const data = await response.json();
  return (data.Items || []).map((item) => mapItemToQueueEntry(item, connection));
};

/** Poster/thumbnail URL for a Jellyfin item. */
export const getJellyfinImageUrl = (itemId, connection) => {
  if (!connection?.serverUrl) return '';
  return `${connection.serverUrl}/Items/${itemId}/Images/Primary?api_key=${connection.accessToken}`;
};

/**
 * Direct-play stream URL for a Jellyfin item, for use as an HTML5 <video> src.
 * `static=true` asks Jellyfin to send the original file as-is (no server-side
 * transcoding) — works when the browser can already play the source codec.
 * If playback fails (unsupported codec), fall back to getTranscodeStreamUrl.
 */
export const getStreamUrl = (itemId, connection) => {
  if (!connection?.serverUrl || !connection?.accessToken) return '';
  return `${connection.serverUrl}/Videos/${itemId}/stream?static=true&api_key=${connection.accessToken}`;
};

/**
 * Transcoded stream URL — asks Jellyfin to re-encode to browser-friendly
 * H.264/AAC in an MP4 container. Slower to start, costs server CPU, but
 * works for source files the browser can't play natively (e.g. HEVC, DTS).
 */
export const getTranscodeStreamUrl = (itemId, connection) => {
  if (!connection?.serverUrl || !connection?.accessToken) return '';
  const params = new URLSearchParams({
    api_key: connection.accessToken,
    videoCodec: 'h264',
    audioCodec: 'aac',
    container: 'mp4'
  });
  return `${connection.serverUrl}/Videos/${itemId}/stream.mp4?${params.toString()}`;
};

/** Quick check that a stored connection is still valid. */
export const verifyJellyfinConnection = async (connection) => {
  if (!connection?.serverUrl || !connection?.accessToken) return false;
  try {
    const response = await fetch(`${connection.serverUrl}/Users/Me`, {
      headers: { 'X-Emby-Token': connection.accessToken, ...CLIENT_HEADERS }
    });
    return response.ok;
  } catch {
    return false;
  }
};
