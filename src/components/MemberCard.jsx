import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Shield, Mic, MicOff, Video, VideoOff, Monitor, Wifi } from 'lucide-react';

export default function MemberCard({ 
  name, 
  status, 
  avatarUrl, 
  statusType = 'online', 
  color = 'lavender', 
  role = 'guest',
  inCall = false,
  micMuted = false,
  cameraEnabled = false,
  screenSharing = false,
  speaking = false,
  connectionQuality = 'Good • 32ms',
  joinedTime = 'Joined 10m ago'
}) {
  // Define status styling configurations for Sprint 3
  const statusConfigs = {
    online: {
      dotColor: 'bg-emerald-400 shadow-[0_0_10px_#34d399]',
      text: 'Online',
      bgColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/15',
    },
    watching: {
      dotColor: 'bg-sky-400 shadow-[0_0_10px_#38bdf8]',
      text: 'Watching',
      bgColor: 'bg-sky-500/10 text-sky-300 border-sky-500/15',
    },
    choosing: {
      dotColor: 'bg-realm-gold shadow-[0_0_10px_#ECC94B]',
      text: 'Choosing Movie',
      bgColor: 'bg-realm-gold/10 text-[#f5d683] border-realm-gold/15',
    },
    away: {
      dotColor: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
      text: 'Away',
      bgColor: 'bg-amber-500/10 text-amber-300 border-amber-500/15',
    },
    disconnected: {
      dotColor: 'bg-gray-500 shadow-[0_0_8px_#6b7280]',
      text: 'Disconnected',
      bgColor: 'bg-gray-500/10 text-gray-400 border-gray-500/15',
    },
    ready: {
      dotColor: 'bg-realm-pink shadow-[0_0_10px_#F3C5C1]',
      text: 'Ready',
      bgColor: 'bg-realm-pink/10 text-realm-pink border-[#fcd5d1]/15',
    }
  };

  const currentStatus = statusConfigs[statusType] || statusConfigs.online;
  const initial = name ? name.charAt(0) : 'R';

  const avatarColors = {
    navy: 'from-[#1B2147] to-[#2B3573] border-realm-lavender/25 text-realm-lavender',
    lavender: 'from-[#3D3A6F] to-[#5854A3] border-realm-lavender/30 text-realm-lavender',
    pink: 'from-[#4D2A3B] to-[#7B3A5A] border-realm-pink/30 text-realm-pink',
    gold: 'from-[#44381C] to-[#6E5924] border-realm-gold/30 text-realm-gold',
    emerald: 'from-[#123A25] to-[#1E6B42] border-emerald-500/30 text-emerald-300',
  };

  const gradientClass = avatarColors[color] || avatarColors.lavender;
  const isOwner = role === 'owner';
  const isHost = role === 'host';
  const isAdmin = role === 'admin' || role === 'moderator';

  return (
    <motion.div
      whileHover={{ x: 4, backgroundColor: 'rgba(16, 20, 45, 0.45)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="flex items-center justify-between p-2.5 rounded-2xl border border-realm-lavender/5 bg-realm-navy-light/10 hover:border-realm-lavender/15 transition-all w-full select-none"
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        {/* Avatar Area */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={name} 
              className={`w-9 h-9 rounded-xl object-cover border transition-all duration-300 ${
                speaking 
                  ? 'border-emerald-400 shadow-[0_0_10px_#34d399] scale-105' 
                  : 'border-realm-lavender/10'
              }`} 
            />
          ) : (
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradientClass} border flex items-center justify-center font-semibold text-xs transition-all duration-300 ${
              speaking 
                ? 'border-emerald-400 shadow-[0_0_10px_#34d399] scale-105' 
                : 'border-realm-lavender/25'
            }`}>
              {initial}
            </div>
          )}
          
          {/* Status Indicator Dot */}
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-realm-navy-dark ${
            inCall ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : currentStatus.dotColor
          }`} />
        </div>

        {/* User Info */}
        <div className="flex flex-col text-left min-w-0">
          <span className="text-xs font-semibold text-realm-moon leading-tight flex items-center truncate">
            <span className="truncate">{name}</span>
            {isOwner && (
              <span className="inline-flex ml-1 p-0.5 rounded bg-realm-gold/15 text-realm-gold border border-realm-gold/20 shrink-0" title="Owner 👑">
                <Crown className="w-3 h-3 text-realm-gold" />
              </span>
            )}
            {!isOwner && isHost && (
              <span className="inline-flex ml-1 p-0.5 rounded bg-realm-gold/15 text-realm-gold border border-realm-gold/20 shrink-0" title="Host ✦">
                <Crown className="w-3 h-3 text-amber-300" />
              </span>
            )}
            {!isOwner && !isHost && isAdmin && (
              <span className="inline-flex ml-1 p-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20 shrink-0" title="Moderator 🛡️">
                <Shield className="w-3 h-3 text-sky-300" />
              </span>
            )}
          </span>

          <div className="flex items-center space-x-1.5 text-[9px] text-realm-moon-muted mt-0.5">
            <span>{status || currentStatus.text}</span>
            <span>•</span>
            <span className="flex items-center space-x-0.5 text-emerald-400">
              <Wifi className="w-2.5 h-2.5" />
              <span>{connectionQuality}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Mic/Cam Indicators & Status Pill */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Mic & Camera Status Badges */}
        <div className="flex items-center space-x-1 bg-realm-navy-dark/60 border border-realm-lavender/10 rounded-lg px-1.5 py-0.5">
          {micMuted ? (
            <MicOff className="w-3 h-3 text-realm-pink/70" title="Mic Muted" />
          ) : (
            <Mic className="w-3 h-3 text-emerald-400/80" title="Mic Active" />
          )}
          {cameraEnabled ? (
            <Video className="w-3 h-3 text-sky-400/80" title="Camera Active" />
          ) : (
            <VideoOff className="w-3 h-3 text-realm-moon-muted/50" title="Camera Off" />
          )}
        </div>

        {/* Status Badge */}
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${currentStatus.bgColor}`}>
          {currentStatus.text}
        </span>
      </div>
    </motion.div>
  );
}

