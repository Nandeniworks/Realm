import React from 'react';
import { motion } from 'framer-motion';

export default function GlassPanel({ children, className = '', hoverEffect = false, ...props }) {
  const Component = hoverEffect ? motion.div : 'div';
  
  const hoverProps = hoverEffect ? {
    whileHover: { 
      y: -4,
      scale: 1.01,
      borderColor: 'rgba(195, 201, 255, 0.18)',
      boxShadow: '0 10px 30px rgba(195, 201, 255, 0.05)',
      backgroundColor: 'rgba(16, 20, 45, 0.5)'
    },
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  } : {};

  return (
    <Component
      className={`glass-panel rounded-3xl p-6 md:p-8 transition-colors duration-300 ${className}`}
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  );
}
