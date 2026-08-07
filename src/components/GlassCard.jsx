import React from 'react';
import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', hover = true, delay = 0, ...props }) {
  // Floating micro-animation
  const floatAnimation = {
    animate: {
      y: [0, -4, 0],
    },
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
      delay: delay
    }
  };

  return (
    <motion.div
      {...floatAnimation}
      whileHover={hover ? {
        y: -6,
        borderColor: 'rgba(195, 201, 255, 0.16)',
        boxShadow: '0 12px 30px rgba(195, 201, 255, 0.05)',
        backgroundColor: 'rgba(16, 20, 45, 0.5)'
      } : {}}
      className={`glass-panel rounded-3xl p-5 md:p-6 transition-all duration-300 border border-realm-lavender/5 shadow-[0_15px_35px_rgba(4,6,16,0.3)] bg-realm-navy-card ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
