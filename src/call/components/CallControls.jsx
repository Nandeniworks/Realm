import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, Monitor, Settings, PhoneOff } from 'lucide-react';
import { useCall } from '../hooks/useCall.js';

export default function CallControls({ onOpenSettings }) {
  const { 
    callStatus, 
    muted, 
    cameraActive, 
    screenSharing, 
    toggleMic, 
    toggleCamera, 
    startScreenShare, 
    stopScreenShare, 
    leaveCall,
    callPermissions
  } = useCall();

  if (callStatus !== 'connected') return null;

  const handleScreenShareClick = () => {
    if (screenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const btnClass = "w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer border backdrop-blur-md relative group select-none";
  const activeClass = "bg-realm-lavender text-realm-navy-dark border-white/20 shadow-[0_0_15px_rgba(195,201,255,0.4)]";
  const inactiveClass = "bg-realm-navy-dark/45 hover:bg-realm-navy-light/60 border-realm-lavender/10 text-realm-moon-muted hover:text-realm-moon";
  const dangerClass = "bg-realm-pink text-realm-navy-dark border-realm-pink/20 hover:bg-red-400 hover:text-realm-navy-dark hover:shadow-[0_0_15px_rgba(243,197,193,0.5)]";

  const isMicBlocked = !callPermissions.voiceEnabled && !window.isRealmHost;
  const isCamBlocked = !callPermissions.cameraEnabled && !window.isRealmHost;
  const isScreenBlocked = callPermissions.screenShareAllowed === 'host' && !window.isRealmHost;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3.5 rounded-3xl border border-realm-lavender/10 bg-[#07091B]/75 backdrop-blur-xl flex items-center space-x-3.5 shadow-[0_15px_40px_rgba(0,0,0,0.5)] select-none"
    >
      {/* Microphone Control */}
      <button
        onClick={toggleMic}
        className={`${btnClass} ${muted ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : inactiveClass} ${isMicBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={muted ? "Unmute Mic (M)" : "Mute Mic (M)"}
        disabled={isMicBlocked}
      >
        {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        <span className="absolute bottom-14 scale-0 group-hover:scale-100 transition-all duration-150 text-[10px] font-bold bg-[#040610] text-realm-moon px-2.5 py-1 rounded-lg border border-realm-lavender/10 shadow-lg whitespace-nowrap z-50">
          {isMicBlocked ? "Mic Disabled by Host" : (muted ? "Unmute Microphone" : "Mute Microphone")} (M)
        </span>
      </button>

      {/* Camera Control */}
      <button
        onClick={toggleCamera}
        className={`${btnClass} ${cameraActive ? activeClass : inactiveClass} ${isCamBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={cameraActive ? "Camera Off (V)" : "Camera On (V)"}
        disabled={isCamBlocked}
      >
        {cameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        <span className="absolute bottom-14 scale-0 group-hover:scale-100 transition-all duration-150 text-[10px] font-bold bg-[#040610] text-realm-moon px-2.5 py-1 rounded-lg border border-realm-lavender/10 shadow-lg whitespace-nowrap z-50">
          {isCamBlocked ? "Camera Disabled by Host" : (cameraActive ? "Disable Webcam" : "Enable Webcam")} (V)
        </span>
      </button>

      {/* Screen Share Control */}
      <button
        onClick={handleScreenShareClick}
        className={`${btnClass} ${screenSharing ? activeClass : inactiveClass} ${isScreenBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={screenSharing ? "Stop Sharing" : "Share Screen"}
        disabled={isScreenBlocked}
      >
        <Monitor className="w-5 h-5" />
        <span className="absolute bottom-14 scale-0 group-hover:scale-100 transition-all duration-150 text-[10px] font-bold bg-[#040610] text-realm-moon px-2.5 py-1 rounded-lg border border-realm-lavender/10 shadow-lg whitespace-nowrap z-50">
          {isScreenBlocked ? "Screen Share Restricted" : (screenSharing ? "Stop Sharing Screen" : "Share Screen")}
        </span>
      </button>

      {/* Settings Modal Toggle */}
      <button
        onClick={onOpenSettings}
        className={`${btnClass} ${inactiveClass}`}
        title="Media Settings"
      >
        <Settings className="w-5 h-5" />
        <span className="absolute bottom-14 scale-0 group-hover:scale-100 transition-all duration-150 text-[10px] font-bold bg-[#040610] text-realm-moon px-2.5 py-1 rounded-lg border border-realm-lavender/10 shadow-lg whitespace-nowrap z-50">
          Call Settings
        </span>
      </button>

      {/* Divider */}
      <span className="h-6 w-px bg-realm-lavender/10" />

      {/* Leave Call Control */}
      <button
        onClick={leaveCall}
        className={`${btnClass} ${dangerClass}`}
        title="Leave Call (L)"
      >
        <PhoneOff className="w-5 h-5" />
        <span className="absolute bottom-14 scale-0 group-hover:scale-100 transition-all duration-150 text-[10px] font-bold bg-[#040610] text-realm-moon px-2.5 py-1 rounded-lg border border-realm-lavender/10 shadow-lg whitespace-nowrap z-50">
          Leave Call (L)
        </span>
      </button>
    </motion.div>
  );
}
