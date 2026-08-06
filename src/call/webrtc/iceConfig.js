// Central ICE server configuration for all WebRTC peer connections.
//
// STUN alone (Google's public servers) is enough for two peers on "easy"
// networks (open NAT / same network) to find each other directly. It is NOT
// enough for a meaningful chunk of real-world users — symmetric NATs,
// school/office/mobile-carrier firewalls, etc. For those, a TURN server
// (which relays the media) is required or the call will just hang at
// "connecting".
//
// Configure a TURN server via Vite env vars (see .env.example) and it will
// automatically be added here. Free/cheap options for testing: Twilio's STUN
// TURN grant, Cloudflare Calls, Metered.ca's free tier, or self-hosting
// coturn. Without one configured, calls will still work for many pairs of
// users but will fail for some — this is a known limitation, not a bug.
const TURN_URL = import.meta.env.VITE_TURN_URL;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL;

export const getIceServers = () => {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  if (TURN_URL) {
    servers.push({
      urls: TURN_URL,
      username: TURN_USERNAME || undefined,
      credential: TURN_CREDENTIAL || undefined
    });
  } else if (import.meta.env.DEV) {
    console.warn(
      '[WebRTC] No TURN server configured (VITE_TURN_URL). Calls between ' +
      'users on restrictive networks (symmetric NAT, some corporate/school ' +
      'wifi) will fail to connect. Fine for local testing, not for a real ' +
      'public deployment.'
    );
  }

  return servers;
};
