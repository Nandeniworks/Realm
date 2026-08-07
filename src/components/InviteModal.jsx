import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Compass, QrCode } from 'lucide-react';
import Button from './Button';

export default function InviteModal({ isOpen, onClose, realmCode = "LUNA-99X", onCopied }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/join?code=${realmCode}`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    if (onCopied) {
      onCopied();
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my watch party on Realm!',
          text: `Enter room code: ${realmCode}`,
          url: inviteUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#040610]/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative w-full max-w-md overflow-hidden glass-panel border border-realm-lavender/10 shadow-[0_25px_60px_rgba(4,6,16,0.9)] p-6 md:p-8 rounded-3xl z-10 bg-realm-navy-dark text-left"
          >
            {/* Glowing background radial blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-realm-lavender/10 blur-[50px] pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-realm-moon-muted hover:text-realm-moon rounded-full hover:bg-realm-navy-light transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-realm-lavender/10 border border-realm-lavender/25 text-realm-lavender flex items-center justify-center mx-auto mb-4">
                <Compass className="w-6 h-6 animate-spin-slow" />
              </div>
              <h3 className="text-xl font-semibold text-realm-moon font-sans">Invite Companions</h3>
              <p className="text-xs text-realm-moon-muted mt-1 leading-relaxed">
                Invite friends to share this room and watch together.
              </p>
            </div>

            <div className="space-y-5">
              {/* Short Room Code & Invite Link */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-medium text-realm-lavender/85">Shareable Invite Link</span>
                  <span className="text-[10px] font-mono font-bold text-realm-moon bg-realm-lavender/10 px-2 py-0.5 rounded border border-realm-lavender/15">
                    Code: {realmCode}
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-[#080b18]/60 border border-realm-lavender/10 p-1.5 rounded-2xl">
                  <span className="text-xs font-mono text-realm-moon-muted truncate pl-3 flex-1 select-all">
                    {inviteUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 bg-realm-lavender text-realm-navy-dark px-3 py-2 rounded-xl text-xs font-semibold hover:bg-white transition-all shadow-sm cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Scannable Real QR Code */}
              <div className="flex flex-col items-center justify-center bg-[#080b18]/40 border border-realm-lavender/5 rounded-2xl p-4 text-center">
                <div className="w-32 h-32 rounded-xl bg-white p-2 border border-realm-lavender/10 flex items-center justify-center relative shadow-md">
                  <img
                    src={qrCodeApiUrl}
                    alt={`QR Code for Room ${realmCode}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] text-realm-moon-muted mt-2.5">Scan this QR code from a mobile device</span>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button variant="secondary" className="flex-1 cursor-pointer" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1 cursor-pointer" icon={Share2} onClick={handleShare}>
                  Share Link
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
