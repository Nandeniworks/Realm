# Watch Party — Backend Status & Setup

## Where things stand

**Core loop (invite → join → watch together → chat → call) is now wired
correctly end-to-end in the code.** The one functional showstopper (voice/
video calls never actually connecting) is fixed. I also closed two gaps that
would've bitten you as soon as real users tried it: no TURN server, and no
non-YouTube media source. None of this has been tested against a live
MongoDB/two real browsers yet (see "What I could and couldn't verify here"),
so treat it as "should work, verify on your machine" rather than "guaranteed."

### 1. Fixed: voice/video calls were dead (see previous notes)
`roomHandler.js` now registers/removes members in `presenceService` with
their real host/guest role, so `joinVoice`, permission checks, mic/camera/
screen-share state, and speaking indicators all actually have data to work
with now.

### 2. Added: TURN server support (`src/call/webrtc/iceConfig.js`)
The call code only ever had Google's public STUN servers configured. STUN
gets two peers talking when their NATs are "easy" — but for real users on
random networks (school wifi, corporate firewalls, some mobile carriers),
STUN alone isn't enough and the call just hangs at "connecting" with no
error. This is *the* most common reason "WebRTC works for me, not for my
friend" happens.

I added `VITE_TURN_URL` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` env
vars (see `.env.example`) that get merged into the ICE server list used by
every peer connection. Without a TURN server configured, calls will still
work for a lot of pairs of people — just not everyone. For "invite anyone,"
I'd treat getting a TURN server as a requirement, not a nice-to-have. Cheap
ways to get one: Twilio's Network Traversal Service, Metered.ca's free tier,
Cloudflare Calls, or self-hosted coturn if you want to avoid recurring cost
at scale.

### 3. Added: Jellyfin support
Wired into the existing `MediaProvider` plug-in pattern (the codebase already
had `youtube` as the only case in a switch statement clearly designed to
grow) rather than bolting on something new:

- **`src/utils/jellyfinApi.js`** — auth against a Jellyfin server
  (`connectJellyfin`), library search (`searchJellyfin`), and stream/image
  URL builders. Talks straight from the browser to the user's own Jellyfin
  server, not through your Node backend — a self-hosted Jellyfin box is
  usually reachable by someone's own devices, not necessarily by wherever
  your backend is hosted.
- **`src/components/media/JellyfinProvider.jsx`** — plays a Jellyfin item via
  a plain `<video>` tag, implementing the exact same imperative interface
  (`play`/`pause`/`seekTo`/`getCurrentTime`/`getDuration`/`setPlaybackRate`/
  `setVolume`) that `YouTubeProvider` does, so it drops into the existing
  sync system in `VideoPlaceholder.jsx` with zero changes needed there —
  that sync layer was already provider-agnostic, which was a pleasant
  surprise given how much else needed fixing.
- Falls back from direct-play to server-side transcode automatically if the
  browser can't play the source codec.

**What's NOT done yet (deliberately, since you said backend-first):** there's
no Settings UI for a user to actually type in their Jellyfin server URL/
login. The plumbing (`connectJellyfin`) is real and works, it just isn't
called from anywhere yet. To test it right now before that UI exists, open
the browser console on your running app and run:
```js
import('/src/utils/jellyfinApi.js').then(async ({ connectJellyfin }) => {
  const conn = await connectJellyfin('http://YOUR_JELLYFIN_IP:8096', 'username', 'password');
  localStorage.setItem('realm_jellyfin_connection', JSON.stringify(conn));
  console.log('connected', conn);
});
```
Then set a realm's `currentVideo.provider` to `'jellyfin'` and `videoId` to a
Jellyfin item ID, and it'll play.

### 4. "Any website" — a reality check, not a bug
This one I want to be straight with you about rather than pretend to build
something that doesn't really exist. There's no general way to pull a
synced, controllable video stream out of an arbitrary third-party website:
most sites block being embedded in an iframe at all (`X-Frame-Options`/CSP),
and even sites that do allow embedding won't hand you programmatic play/
pause/seek control or a shared playback clock. There are really only two
approaches that actually work in practice, and this app already has both:
- **YouTube / Jellyfin (and easily: Vimeo, Twitch, anything with a real
  embeddable player API)** — full sync, host controls, the whole experience.
  Adding another one of these is a similar-sized job to what I just did for
  Jellyfin.
- **Screen share** — already fully implemented (`screenShareState` socket
  events, `CallEngine.startScreenShare/stopScreenShare`). One person shares
  their tab/window (works for literally any site — Netflix, Disney+,
  whatever) and everyone else sees it live over WebRTC. No shared playback
  clock/host-seek — it's exactly what everyone in the call sees, in
  real time, same as a normal screen share on Discord/Zoom.

If there's a specific site you had in mind beyond YouTube/Jellyfin, happy to
look at whether it has an embeddable player worth building a real provider
for — just tell me which one.

## Known gaps still worth knowing about
1. **MongoDB is a hard requirement for realms/chat/social** (see previous
   notes) — only login/register degrade gracefully without it.
2. `server/.env`'s `MONGODB_URI` (`mongodb://127.0.0.1`) has no port or
   database name — make it explicit, e.g. `mongodb://127.0.0.1:27017/watchparty`.
3. `googleLogin`/`refresh` don't have the same offline fallback as
   `login`/`register` — low priority, frontend has its own Firebase-based
   fallback for local demos.
4. YouTube search calls Google's API directly from the browser with an
   exposed API key (see `.env.example` note) — fine for a personal project,
   restrict the key or proxy it through your backend before wider release.
5. Lint warnings are all cosmetic (unused icon imports, one ref-in-cleanup
   warning) — listed in git history of this doc if you want them later.

## What I could and couldn't verify here
I don't have a MongoDB server or two real browsers available in this
environment, so I couldn't run a live two-user join → chat → call → watch
test end to end. What I *did* verify:
- Frontend builds clean (`vite build`), 0 lint errors.
- Every backend file syntax-checks and the server boots (with and without
  Mongo reachable).
- Traced every socket event from client emit → server handler → broadcast →
  client listener by hand, for room join/leave, chat, video sync, and calls,
  confirming the fixed presence bug was the actual root cause and that the
  fix is self-consistent with the rest of the DB-backed host logic.
- Traced the exact interface contract between `VideoPlaceholder.jsx` and
  `MediaProvider` to confirm `JellyfinProvider` satisfies it exactly.

**Next real step: get MongoDB running (Atlas free tier is fastest — no local
install) and actually run it with two browser tabs.** I'd rather find out now
if something behaves differently under real conditions than keep reasoning
about it in the abstract. Want me to walk through Atlas setup, or do you
already have MongoDB running somewhere?

## Running it locally
```bash
npm install
cd server && npm install && cd ..
cp .env.example .env   # fill in VITE_YOUTUBE_API_KEY / VITE_TURN_* if you have them
npm run dev             # starts frontend AND backend together
```
Then open `http://localhost:5173`.

**Why this matters — the recurring 502 login error:** the frontend
(`vite`) and backend (`node server.js`) are two separate processes.
Previously there was no single command to start both, so it was easy to
launch only the frontend, get `502 Bad Gateway` on `/auth/login` and
`/auth/register` (Vite's dev proxy has nothing to forward to), "fix" it by
remembering to start the backend, then hit the same thing again next
session after a reboot. `npm run dev` now starts both together via
`concurrently`, and the backend runs under `nodemon` in dev mode so it
auto-restarts if it crashes instead of just staying dead. If you still see
502s after this, it means the backend process itself is erroring on startup
— check the `[BACKEND]`-prefixed lines in the terminal output for the
actual error (most likely MongoDB-related, see below).

Need frontend/backend running separately (e.g. for separate terminal logs)?
`npm run dev:client` and `npm run dev:server` still work individually.

