import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function Toast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full glass-panel border-realm-lavender/10 shadow-[0_15px_30px_rgba(4,6,16,0.5)] flex items-center space-x-2 bg-realm-navy-dark/90 text-sm font-sans"
        >
          <div className="w-5 h-5 rounded-full bg-realm-lavender/15 text-realm-lavender flex items-center justify-center">
            <Sparkles className="w-3 h-3 animate-pulse" />
          </div>
          <span className="text-realm-moon font-medium tracking-wide">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
