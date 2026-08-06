import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, AlertTriangle, ArrowLeft } from 'lucide-react';
import RealmHeader from '../components/RealmHeader';
import RealmSidebar from '../components/RealmSidebar';
import VideoPlaceholder from '../components/VideoPlaceholder';
import MovieQueue from '../components/MovieQueue';
import ChatPanel from '../components/ChatPanel';
import InviteModal from '../components/InviteModal';
import RoomSettingsModal from '../components/RoomSettingsModal';
import GlassPanel from '../components/GlassPanel';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { useRealm } from '../contexts/RealmContext';
import { useSocket } from '../hooks/useSocket';
import { usePresence } from '../hooks/usePresence';
import { useAuth } from '../contexts/AuthContext';

// Call Engine imports
import { CallProvider } from '../call/contexts/CallContext';
import { useCall } from '../call/hooks/useCall';
import CallControls from '../call/components/CallControls';
import VideoBubbles from '../call/components/VideoBubbles';
import CallNotifications from '../call/components/CallNotifications';
import MediaSettingsModal from '../call/components/MediaSettingsModal';

function CallKeyboardShortcuts() {
  const { callStatus, toggleMic, toggleCamera, leaveCall } = useCall();

  useEffect(() => {
    if (callStatus !== 'connected') return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const key = e.key.toLowerCase();
      if (key === 'm') {
        e.preventDefault();
        toggleMic();
      } else if (key === 'v') {
        e.preventDefault();
        toggleCamera();
      } else if (key === 'l') {
        e.preventDefault();
        leaveCall();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callStatus, toggleMic, toggleCamera, leaveCall]);

  return null;
}

export default function RealmPage() {
  const { id } = useParams();
  const roomCode = id ? id.toUpperCase() : '';
  const { currentUser, loading: authLoading } = useAuth();

  // Guard: this route previously had no auth check at all, so a logged-out
  // (or not-yet-session-restored) visitor could land here and connect to
  // the socket/room as an anonymous guest instead of being asked to log in,
  // unlike CreateRealmPage and JoinRealmPage which both already gate this.
  if (authLoading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#040610]">
        <div className="w-6 h-6 rounded-full border-2 border-realm-lavender/30 border-t-realm-lavender animate-spin" />
      </div>
    );
  }
  if (!currentUser) {
    return <Navigate to={`/join?redirect=/realm/${roomCode}`} replace />;
  }

  return <RealmPageInner roomCode={roomCode} currentUser={currentUser} />;
}

function RealmPageInner({ roomCode, currentUser }) {
  const {
    currentRealm, 
    loading, 
    error, 
    loadRealm, 
    updateRealm,
    clearError,
    setCurrentRealm
  } = useRealm();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);
  const [initLoaded, setInitLoaded] = useState(false);
  const [localToast, setLocalToast] = useState(null);

  const playerRef = useRef(null);

  // Video sync websocket callbacks
  const videoCallbacks = useRef({
    onPlay: (time) => {
      if (playerRef.current?.syncPlay) {
        playerRef.current.syncPlay(time);
      }
    },
    onPause: (time) => {
      if (playerRef.current?.syncPause) {
        playerRef.current.syncPause(time);
      }
    },
    onSeek: (time) => {
      if (playerRef.current?.syncSeek) {
        playerRef.current.syncSeek(time);
      }
    },
    onPlaybackRateChanged: (rate) => {
      if (playerRef.current?.syncPlaybackRate) {
        playerRef.current.syncPlaybackRate(rate);
      }
    },
    onSyncState: (state) => {
      if (playerRef.current?.syncState) {
        playerRef.current.syncState(state);
      }
    },
    onSyncResponse: (state) => {
      if (playerRef.current?.syncState) {
        playerRef.current.syncState(state);
      }
    },
    onVideoChanged: (video) => {
      setCurrentRealm(prev => prev ? { ...prev, currentVideo: video } : null);
    },
    onQueueUpdated: (queue) => {
      setCurrentRealm(prev => prev ? { ...prev, queue } : null);
    }
  });

  const currentUsername = currentUser?.displayName || currentUser?.username || 'You';

  // Connect to Socket.IO and establish real-time presence
  const { socket, connectionState } = useSocket(roomCode, currentUser);
  const { 
    members: liveMembers, 
    typingUsers, 
    systemMessages, 
    toastMessage, 
    triggerTyping,
    
    liveMessages,
    pinnedMessage,
    activeReaction,
    unreadCount,
    clearUnreadCount,
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    sendReaction,
    toggleMessageReaction,
    muteMember,
    kickMember,
    setActiveReaction
  } = usePresence(
    socket, 
    roomCode, 
    currentUsername, 
    videoCallbacks.current, 
    currentRealm?.chatMessages || [], 
    currentRealm?.pinnedMessage
  );

  useEffect(() => {
    if (socket) {
      window.realmSocket = socket;
    }
    return () => {
      window.realmSocket = null;
    };
  }, [socket]);

  useEffect(() => {
    if (toastMessage) {
      setLocalToast(toastMessage);
      setTimeout(() => setLocalToast(null), 3500);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (roomCode) {
      setInitLoaded(false);
      loadRealm(roomCode)
        .then(() => setInitLoaded(true))
        .catch(() => setInitLoaded(true));
    }
    return () => clearError();
  }, [roomCode]);

  const handleSelectMovie = async (movie) => {
    if (!roomCode) return;
    
    const targetVideo = {
      title: movie.title,
      duration: movie.duration,
      videoId: movie.videoId,
      thumbnailUrl: movie.thumbnailUrl,
      channelTitle: movie.channelTitle || 'Madman Anime',
      provider: movie.provider || 'youtube',
      views: '12M views',
      uploadDate: 'Released recently'
    };

    try {
      await updateRealm(roomCode, { currentVideo: targetVideo });
      if (socket) {
        socket.emit('videoChanged', { code: roomCode, video: targetVideo });
      }
    } catch (err) {
      console.error('Failed to change playing video:', err);
    }
  };

  const handleCopyToast = () => {
    setLocalToast("Invitation copied to your clipboard.");
    setTimeout(() => setLocalToast(null), 3500);
  };

  const connectionIndicatorStyles = {
    'Connected': 'bg-emerald-400 border-emerald-500/30 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]',
    'Connecting...': 'bg-amber-400 border-amber-500/30 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse',
    'Reconnecting...': 'bg-amber-400 border-amber-500/30 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse',
    'Disconnected': 'bg-realm-pink border-realm-pink/30 text-realm-pink shadow-[0_0_8px_rgba(243,197,193,0.3)]'
  };

  if (loading && !initLoaded) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-[#040610] text-realm-moon font-sans overflow-hidden z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-sm px-6 relative z-10"
        >
          <GlassPanel className="text-center p-8 border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.8)] bg-realm-navy-dark">
            <h2 className="text-xl font-semibold text-realm-moon tracking-wide">
              Entering Lounge...
            </h2>
            <p className="text-xs text-realm-moon-muted mt-2">
              Preparing environment...
            </p>

            <div className="w-full h-1 bg-realm-navy-light rounded-full overflow-hidden mt-6">
              <motion.div 
                className="h-full bg-realm-lavender" 
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-[#040610] text-realm-moon font-sans overflow-hidden z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-md px-6"
        >
          <GlassPanel className="text-center p-8 border-realm-pink/20 shadow-[0_20px_50px_rgba(4,6,16,0.8)] bg-realm-navy-dark">
            <div className="w-14 h-14 rounded-full bg-realm-pink/10 border border-realm-pink/25 text-realm-pink flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-semibold text-realm-moon tracking-wide">
              Lounge Unavailable
            </h2>
            <p className="text-sm text-realm-moon-muted mt-3 leading-relaxed">
              &ldquo;{error}&rdquo;
            </p>

            <div className="mt-8 flex flex-col space-y-3">
              <Link to="/join">
                <Button variant="primary" className="w-full" icon={Compass}>
                  Try Different Code
                </Button>
              </Link>
              <Link to="/">
                <Button variant="secondary" className="w-full" icon={ArrowLeft}>
                  Return to Home
                </Button>
              </Link>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  if (!currentRealm) return null;

  const { name, code } = currentRealm;
  const activeVideo = currentRealm.currentVideo || { title: 'Spirited Away', duration: '2h 5m' };

  const selfMember = liveMembers.find(m => m.socketId === socket?.id);
  const isHost = selfMember ? selfMember.role === 'host' : false;

  return (
    <CallProvider socket={socket} roomCode={roomCode} isHost={isHost}>
      <CallKeyboardShortcuts />
      <div className="relative w-full min-h-screen overflow-hidden text-realm-moon font-sans bg-[#040610]">
        
        {/* Connection State Badge */}
        <div className="absolute top-6 right-6 z-40 flex items-center space-x-2">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${connectionIndicatorStyles[connectionState] || connectionIndicatorStyles.Disconnected}`}>
            {connectionState}
          </span>
        </div>

        {/* Page Content container */}
        <div className="relative z-10 w-full h-screen flex flex-col p-4 md:p-6 lg:p-8">
          
          {/* Responsive 3-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
            
            {/* Column A (Left): Sidebar Panel (Col span: 3) */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
              className="lg:col-span-3 h-full min-h-[450px] lg:min-h-0"
            >
              <RealmSidebar
                onOpenInvite={() => setIsInviteOpen(true)}
                onOpenRoomSettings={() => setIsRoomSettingsOpen(true)}
                realmCode={code}
                liveMembers={liveMembers}
                onMuteMember={(memberName) => muteMember(memberName, 5)}
              />
            </motion.div>

            {/* Column B (Center): Cinematic Player & Queue (Col span: 6) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="lg:col-span-6 h-full flex flex-col space-y-6 overflow-y-auto pr-1 scrollbar pb-6 lg:pb-0"
            >
              {/* Header */}
              <RealmHeader realmName={name} />

              {/* Cinematic Player */}
              <VideoPlaceholder 
                title={activeVideo.title} 
                duration={activeVideo.duration} 
                playerRef={playerRef}
                activeReaction={activeReaction}
                onClearReaction={() => setActiveReaction(null)}
              />

              {/* Playlist Queue */}
              <MovieQueue onSelectMovie={handleSelectMovie} />
            </motion.div>

            {/* Column C (Right): Live Chat Panel (Col span: 3) */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
              className="lg:col-span-3 h-[500px] lg:h-full"
            >
              <ChatPanel 
                onTyping={triggerTyping} 
                typingUsers={typingUsers}
                systemMessages={systemMessages}
                liveMessages={liveMessages}
                pinnedMessage={pinnedMessage}
                sendMessage={sendMessage}
                editMessage={editMessage}
                deleteMessage={deleteMessage}
                pinMessage={pinMessage}
                sendReaction={sendReaction}
                toggleMessageReaction={toggleMessageReaction}
                unreadCount={unreadCount}
                clearUnreadCount={clearUnreadCount}
                liveMembers={liveMembers}
                userName={currentUsername}
              />
            </motion.div>

          </div>
        </div>

        {/* Floating System notifications */}
        <Toast message={localToast} />

        {/* Popup Overlay Invites & Room Settings */}
        <InviteModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          realmCode={code}
          onCopied={handleCopyToast}
        />

        <RoomSettingsModal
          isOpen={isRoomSettingsOpen}
          onClose={() => setIsRoomSettingsOpen(false)}
        />

        {/* WebRTC Voice Call Floating Components */}
        <CallControls onOpenSettings={() => setIsSettingsOpen(true)} />
        <VideoBubbles liveMembers={liveMembers} currentSocket={socket} />
        <CallNotifications />
        <MediaSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </CallProvider>
  );
}
