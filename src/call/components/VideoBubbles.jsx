import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MicOff, Pin, PinOff, EyeOff, Eye, ChevronRight, ChevronLeft, Volume2 } from 'lucide-react';
import { useCall } from '../hooks/useCall.js';

// Individual WebRTC video bubble
function VideoBubble({ 
  socketId, 
  stream, 
  member, 
  isLocal, 
  isPinned, 
  onPin, 
  activeSpeakerId 
}) {
  const videoRef = useRef(null);
  const { cameraActive, mirrorLocalVideo } = useCall();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Bind active speaker device (sinkId) dynamically
  useEffect(() => {
    if (videoRef.current && activeSpeakerId && !isLocal) {
      if (typeof videoRef.current.setSinkId === 'function') {
        videoRef.current.setSinkId(activeSpeakerId).catch(err => {
          console.warn('[CallEngine] setSinkId failed:', err);
        });
      }
    }
  }, [activeSpeakerId, isLocal]);

  const name = isLocal ? 'You' : (member?.name || 'Guest');
  const color = member?.color || 'lavender';
  const micMuted = member?.micMuted ?? false;
  const cameraEnabled = isLocal ? cameraActive : (member?.cameraEnabled ?? false);
  const speaking = member?.speaking ?? false;
  const initial = name.charAt(0);

  // Avatar gradient styles matching main app theme
  const avatarColors = {
    navy: 'from-[#1B2147] to-[#2B3573] border-realm-lavender/25 text-realm-lavender',
    lavender: 'from-[#3D3A6F] to-[#5854A3] border-realm-lavender/30 text-realm-lavender',
    pink: 'from-[#4D2A3B] to-[#7B3A5A] border-realm-pink/30 text-realm-pink',
    gold: 'from-[#44381C] to-[#6E5924] border-realm-gold/30 text-realm-gold',
    emerald: 'from-[#123A25] to-[#1E6B42] border-emerald-500/30 text-emerald-300',
  };
  const gradientClass = avatarColors[color] || avatarColors.lavender;

  // Active speaking indicator border
  const glowBorder = speaking 
    ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.55)] scale-105 animate-pulse z-20' 
    : 'border-realm-lavender/15 hover:border-realm-lavender/35';

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={{ left: -800, right: 200, top: -500, bottom: 200 }}
      whileDrag={{ scale: 1.05, zIndex: 50 }}
      className={`relative rounded-full flex items-center justify-center overflow-hidden border backdrop-blur-md cursor-grab active:cursor-grabbing select-none transition-shadow duration-300 ${glowBorder} ${
        isPinned ? 'w-36 h-36 md:w-44 md:h-44' : 'w-24 h-24 md:w-28 md:h-28'
      } bg-[#060818]/65 shadow-[0_8px_30px_rgba(0,0,0,0.4)] shrink-0`}
    >
      {/* HTML5 Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLocal && mirrorLocalVideo ? '-scale-x-100' : ''
        } ${cameraEnabled ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}
      />

      {/* Fallback Initial Avatar UI if camera is off */}
      {!cameraEnabled && (
        <div className={`w-full h-full bg-gradient-to-tr ${gradientClass} flex flex-col items-center justify-center`}>
          <span className="text-xl md:text-2xl font-bold tracking-wider">{initial}</span>
          <span className="text-[8px] uppercase tracking-wider text-realm-moon-muted mt-1">Camera Off</span>
        </div>
      )}

      {/* Glass Overlay Name / Controls */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#040610]/80 to-transparent py-1.5 px-2 flex flex-col items-center pointer-events-none">
        <span className="text-[9px] font-bold text-realm-moon truncate max-w-[80px]">
          {name}
        </span>
        <div className="flex space-x-1 mt-0.5 items-center">
          {micMuted && (
            <span className="p-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/20">
              <MicOff className="w-2.5 h-2.5" />
            </span>
          )}
          {speaking && (
            <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
              <Volume2 className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
      </div>

      {/* Hover action overlay controls */}
      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin(socketId);
          }}
          className="p-1.5 rounded-full bg-realm-navy-dark/70 hover:bg-realm-lavender text-realm-moon hover:text-realm-navy-dark border border-realm-lavender/10 cursor-pointer"
          title={isPinned ? "Unpin webcam" : "Pin webcam"}
        >
          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      </div>
    </motion.div>
  );
}

export default function VideoBubbles({ liveMembers, currentSocket }) {
  const { 
    callStatus, 
    localStream, 
    remoteStreams, 
    activeDevices 
  } = useCall();

  const [pinnedSocketId, setPinnedSocketId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  if (callStatus !== 'connected') return null;

  const localSocketId = currentSocket?.id || 'local';

  // Toggle pin
  const handlePin = (socketId) => {
    if (pinnedSocketId === socketId) {
      setPinnedSocketId(null);
    } else {
      setPinnedSocketId(socketId);
    }
  };

  // Find membership mapping data
  const getMemberData = (socketId) => {
    return liveMembers.find(m => m.socketId === socketId);
  };

  // Build stream lists
  const renderList = [];
  
  // Render local stream (if mic or camera active)
  if (localStream) {
    const localMember = liveMembers.find(m => m.socketId === localSocketId);
    renderList.push({
      socketId: localSocketId,
      stream: localStream,
      member: localMember || { name: 'You', color: 'emerald', speaking: false, micMuted: false },
      isLocal: true
    });
  }

  // Render remote streams
  remoteStreams.forEach((stream, socketId) => {
    renderList.push({
      socketId,
      stream,
      member: getMemberData(socketId),
      isLocal: false
    });
  });

  if (renderList.length === 0) return null;

  // Split into pinned and default items
  const pinnedItem = renderList.find(item => item.socketId === pinnedSocketId);
  const normalItems = renderList.filter(item => item.socketId !== pinnedSocketId);

  if (isHidden) {
    return (
      <div className="fixed top-24 right-6 z-30">
        <button
          onClick={() => setIsHidden(false)}
          className="p-2 rounded-2xl bg-[#060818]/65 border border-realm-lavender/10 text-realm-moon hover:bg-realm-navy-light/40 backdrop-blur-md cursor-pointer flex items-center space-x-1.5 shadow-md text-xs font-semibold select-none"
        >
          <Eye className="w-4 h-4" />
          <span>Show webcams ({renderList.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-24 right-6 z-30 flex flex-col items-end space-y-4 max-h-[75vh] select-none pointer-events-none">
      
      {/* Toolbar controls header */}
      <div className="flex items-center space-x-2 pointer-events-auto bg-[#060818]/65 border border-realm-lavender/10 rounded-2xl p-1.5 shadow-md backdrop-blur-md">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-xl text-realm-moon-muted hover:text-realm-moon hover:bg-realm-navy-light/40 cursor-pointer"
          title={collapsed ? "Expand Webcams" : "Collapse Webcams"}
        >
          {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setIsHidden(true)}
          className="p-1 rounded-xl text-realm-moon-muted hover:text-realm-moon hover:bg-realm-navy-light/40 cursor-pointer"
          title="Hide Webcams"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col items-end space-y-4 overflow-y-auto pr-1 pb-4 max-h-[60vh] scrollbar pointer-events-auto">
        {/* Pinned Bubble first (renders larger) */}
        {pinnedItem && (
          <VideoBubble
            key={`pinned-${pinnedItem.socketId}`}
            socketId={pinnedItem.socketId}
            stream={pinnedItem.stream}
            member={pinnedItem.member}
            isLocal={pinnedItem.isLocal}
            isPinned={true}
            onPin={handlePin}
            activeSpeakerId={activeDevices.speaker}
          />
        )}

        {/* Regular Bubbles */}
        {!collapsed && (
          <div className="flex flex-col items-end space-y-3.5">
            {normalItems.map((item) => (
              <VideoBubble
                key={item.socketId}
                socketId={item.socketId}
                stream={item.stream}
                member={item.member}
                isLocal={item.isLocal}
                isPinned={false}
                onPin={handlePin}
                activeSpeakerId={activeDevices.speaker}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
