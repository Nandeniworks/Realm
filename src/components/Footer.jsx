import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative w-full py-12 px-6 mt-auto border-t border-realm-lavender/5 bg-[#040610]/50 backdrop-blur-md overflow-hidden z-10">
      {/* Decorative subtle twinkling stars */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute left-[15%] top-1/3 text-realm-lavender/20"
          animate={{ opacity: [0.1, 0.6, 0.1], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-4 h-4" />
        </motion.div>
        <motion.div 
          className="absolute right-[20%] top-1/2 text-realm-pink/20"
          animate={{ opacity: [0.1, 0.5, 0.1], scale: [0.7, 1.1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </motion.div>
        <motion.div 
          className="absolute left-[45%] bottom-1/4 text-realm-gold/20"
          animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.9, 1.3, 0.9] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        >
          <Sparkles className="w-3 h-3" />
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 text-sm">
        <div className="flex items-center space-x-2">
          <span className="font-semibold tracking-wide text-realm-lavender/80">Realm</span>
          <span className="text-realm-moon-muted">—</span>
          <span className="text-realm-moon-muted">Magical nights with friends.</span>
        </div>

        <div className="flex items-center space-x-6 text-realm-moon-muted">
          <a href="/#terms" className="hover:text-realm-lavender transition-colors">Terms</a>
          <a href="/#privacy" className="hover:text-realm-lavender transition-colors">Privacy</a>
          <a href="/#contact" className="hover:text-realm-lavender transition-colors">Contact</a>
        </div>

        <div className="text-realm-moon-muted/60 text-xs">
          &copy; {new Date().getFullYear()} Realm. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
