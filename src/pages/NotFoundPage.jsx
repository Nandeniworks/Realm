import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ArrowLeft } from 'lucide-react';
import Button from '../components/Button';
import GlassPanel from '../components/GlassPanel';

export default function NotFoundPage() {
  return (
    <div className="relative z-10 w-full min-h-screen flex items-center justify-center pt-32 pb-16 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="w-full max-w-md text-center"
      >
        <GlassPanel className="border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.8)]">
          <div className="w-16 h-16 rounded-full bg-realm-lavender/10 border border-realm-lavender/25 text-realm-lavender flex items-center justify-center mx-auto mb-6">
            <Compass className="w-8 h-8 animate-pulse" />
          </div>

          <h1 className="text-6xl font-bold text-realm-moon font-mono tracking-wider mb-2">404</h1>
          <h2 className="text-xl font-semibold text-realm-lavender mb-4">Realm Lost in Space</h2>
          
          <p className="text-sm text-realm-moon-muted mb-8 leading-relaxed">
            The path you are looking for has faded into the cosmic dust. Let's guide you back to the center of the universe.
          </p>

          <Link to="/">
            <Button variant="primary" className="w-full" icon={ArrowLeft}>
              Back to Safety
            </Button>
          </Link>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
