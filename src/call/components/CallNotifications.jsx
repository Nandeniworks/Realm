import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';
import { useCall } from '../hooks/useCall.js';

export default function CallNotifications() {
  const { 
    activeScreenSharer, 
    callErrors, 
    removeError, 
    forceStopUserScreenShare 
  } = useCall();

  const isHost = window.isRealmHost === true;

  // Error icon mapping
  const getIcon = (type) => {
    switch (type) {
      case 'danger':
        return <ShieldAlert className="w-4.5 h-4.5 text-realm-pink" />;
      case 'info':
        return <Info className="w-4.5 h-4.5 text-sky-400" />;
      case 'warning':
      default:
        return <AlertTriangle className="w-4.5 h-4.5 text-realm-gold" />;
    }
  };

  // Error card styling mapping
  const getBorderColor = (type) => {
    switch (type) {
      case 'danger':
        return 'border-realm-pink/20 bg-realm-pink/10 shadow-[0_4px_20px_rgba(243,197,193,0.15)] text-[#fad5d2]';
      case 'info':
        return 'border-sky-500/20 bg-sky-500/10 shadow-[0_4px_20px_rgba(56,189,248,0.15)] text-sky-200';
      case 'warning':
      default:
        return 'border-realm-gold/20 bg-realm-gold/10 shadow-[0_4px_20px_rgba(236,201,75,0.15)] text-[#fad58c]';
    }
  };

  return (
    <>
      {/* 1. Screen Sharing floating notification (Top Center) */}
      <AnimatePresence>
        {activeScreenSharer && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -40, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-2xl border border-realm-lavender/10 bg-[#07091B]/85 backdrop-blur-xl flex items-center space-x-3 shadow-lg select-none pointer-events-auto"
          >
            <div className="w-8 h-8 rounded-xl bg-realm-lavender/10 border border-realm-lavender/25 text-realm-lavender flex items-center justify-center animate-pulse">
              <Monitor className="w-4.5 h-4.5" />
            </div>
            
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-realm-moon leading-tight">Screen Share Active</span>
              <span className="text-[10px] text-realm-moon-muted mt-0.5">
                {activeScreenSharer.name} is sharing their screen.
              </span>
            </div>

            {/* Host capability to force stop remote screen share */}
            {isHost && activeScreenSharer.socketId !== 'local' && (
              <button
                onClick={() => forceStopUserScreenShare(activeScreenSharer.socketId)}
                className="ml-3 px-3 py-1.5 rounded-xl bg-realm-pink text-realm-navy-dark hover:bg-white text-[10px] font-bold transition-all cursor-pointer shadow-sm shrink-0 border border-realm-pink/20"
              >
                Stop Sharing
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Network/Media Error Cards (Top Right Stack) */}
      <div className="fixed top-24 right-6 z-40 flex flex-col space-y-2.5 max-w-sm pointer-events-none select-none">
        <AnimatePresence>
          {callErrors.map((error) => (
            <motion.div
              key={error.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              className={`p-3.5 rounded-2xl border backdrop-blur-xl flex items-start space-x-3 pointer-events-auto relative overflow-hidden ${getBorderColor(error.type)}`}
            >
              <div className="shrink-0 mt-0.5">
                {getIcon(error.type)}
              </div>
              
              <div className="flex-1 flex flex-col text-left pr-4">
                <span className="text-[11px] font-semibold leading-relaxed">
                  {error.message}
                </span>
              </div>

              <button
                onClick={() => removeError(error.id)}
                className="absolute top-2.5 right-2.5 p-0.5 text-realm-moon-muted hover:text-realm-moon hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
