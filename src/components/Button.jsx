import React from 'react';
import { motion } from 'framer-motion';

export default function Button({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = '', 
  type = 'button',
  icon: Icon,
  disabled = false,
  ...props 
}) {
  const baseStyles = "relative inline-flex items-center justify-center font-medium rounded-2xl transition-all outline-none overflow-hidden select-none px-6 py-3.5 text-sm md:text-base";
  
  const variants = {
    primary: "bg-gradient-to-r from-realm-lavender via-[#b1b8fc] to-realm-lavender text-realm-navy-dark shadow-[0_4px_20px_rgba(195,201,255,0.25)] hover:shadow-[0_4px_30px_rgba(195,201,255,0.4)]",
    secondary: "border border-realm-lavender/20 text-realm-lavender hover:bg-realm-lavender/5",
    glass: "glass-panel text-realm-moon hover:bg-realm-navy-light/60 border-realm-lavender/10 hover:border-realm-lavender/25",
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { 
        y: -2,
        scale: 1.02,
      }}
      whileTap={disabled ? {} : { 
        scale: 0.98,
        y: 0
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {/* Glow effect on hover for primary button */}
      {variant === 'primary' && (
        <span className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      
      {Icon && <Icon className={`w-4 h-4 mr-2 ${variant === 'primary' ? 'text-realm-navy-dark' : 'text-realm-lavender'}`} />}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
