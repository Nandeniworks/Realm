import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

const CURSOR_THEMES = {
  'moonlight-academy': { particle: '✨', size: 24, hoverSize: 48, stiffness: 350, damping: 25 },
  'iron-kingdom': { particle: '❄️', size: 26, hoverSize: 44, stiffness: 280, damping: 22 },
  'elven-vale': { particle: '🍃', size: 22, hoverSize: 46, stiffness: 380, damping: 26 },
  'pixie-hollow': { particle: '✨', size: 20, hoverSize: 42, stiffness: 450, damping: 28 },
  'ocean-sanctuary': { particle: '🫧', size: 28, hoverSize: 52, stiffness: 250, damping: 20 },
  'galactic-frontier': { particle: '🚀', size: 24, hoverSize: 48, stiffness: 400, damping: 24 },
  'whispering-hills': { particle: '🌾', size: 24, hoverSize: 44, stiffness: 320, damping: 25 },
  'hidden-village': { particle: '🌸', size: 22, hoverSize: 48, stiffness: 360, damping: 26 },
  'ocean-odyssey': { particle: '🌊', size: 26, hoverSize: 50, stiffness: 300, damping: 22 },
  'titan-citadel': { particle: '⚡', size: 28, hoverSize: 46, stiffness: 220, damping: 18 },
  'crimson-forest': { particle: '🍁', size: 22, hoverSize: 46, stiffness: 350, damping: 26 },
  'winter-castle': { particle: '❄️', size: 24, hoverSize: 48, stiffness: 320, damping: 24 },
  'dream-boulevard': { particle: '💖', size: 26, hoverSize: 54, stiffness: 300, damping: 22 },
  'wonderland-tea-garden': { particle: '🃏', size: 24, hoverSize: 50, stiffness: 340, damping: 24 }
};

export default function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [activeTheme, setActiveTheme] = useState('moonlight-library');
  const [trail, setTrail] = useState([]);
  
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const themeConfig = CURSOR_THEMES[activeTheme] || CURSOR_THEMES['moonlight-academy'];

  // Dynamic Springs based on active realm coefficients
  const springConfig = { 
    damping: themeConfig.damping, 
    stiffness: themeConfig.stiffness, 
    mass: 0.45 
  };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  const prevPos = useRef({ x: 0, y: 0 });
  const pIdRef = useRef(0);

  // Listen to dynamic theme change events broadcast by ThemeBackground
  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail && e.detail.metadata) {
        setActiveTheme(e.detail.metadata.id);
      }
    };

    window.addEventListener('realm-theme-changed', handleThemeChange);
    // Initialize if already set on window
    if (window.activeRealmConfig && window.activeRealmConfig.metadata) {
      setActiveTheme(window.activeRealmConfig.metadata.id);
    }

    return () => {
      window.removeEventListener('realm-theme-changed', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const moveCursor = (e) => {
      const offset = hovered ? themeConfig.hoverSize / 2 : themeConfig.size / 2;
      cursorX.set(e.clientX - offset);
      cursorY.set(e.clientY - offset);
      
      if (!visible) setVisible(true);

      // Spawn trailing particles when cursor moves beyond a threshold
      const dist = Math.hypot(e.clientX - prevPos.current.x, e.clientY - prevPos.current.y);
      if (dist > 8) {
        spawnParticle(e.clientX, e.clientY);
        prevPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    const addHoverListeners = () => {
      const targets = document.querySelectorAll('a, button, input, textarea, [role="button"], .cursor-pointer');
      targets.forEach((el) => {
        el.addEventListener('mouseenter', () => setHovered(true));
        el.addEventListener('mouseleave', () => setHovered(false));
      });
    };

    window.addEventListener('mousemove', moveCursor);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    
    addHoverListeners();
    const observer = new MutationObserver(addHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      observer.disconnect();
    };
  }, [visible, hovered, activeTheme]);

  const spawnParticle = (x, y) => {
    const pId = pIdRef.current++;
    const newParticle = {
      id: pId,
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2 + 1, // slight downward drift
      scale: 1.0,
      opacity: 0.8
    };

    setTrail((prev) => [...prev.slice(-15), newParticle]); // Cap trail at 15 particles
    
    // Automatically fade out particle
    setTimeout(() => {
      setTrail((prev) => prev.filter((p) => p.id !== pId));
    }, 800);
  };

  if (!visible) return null;

  return (
    <>
      {/* 1. Trail Particles layer */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-50 overflow-hidden hidden md:block">
        <AnimatePresence>
          {trail.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: p.opacity, scale: 0.8, x: p.x, y: p.y }}
              animate={{ 
                opacity: 0, 
                scale: 0.1, 
                x: p.x + p.vx * 15, 
                y: p.y + p.vy * 15 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute text-xs pointer-events-none select-none select-none text-shadow-glow"
              style={{
                color: 'var(--color-realm-lavender)',
                textShadow: '0 0 8px var(--color-realm-lavender)'
              }}
            >
              {themeConfig.particle}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 2. Primary Themed Cursor Node */}
      <motion.div
        className="fixed top-0 left-0 rounded-full border pointer-events-none z-50 mix-blend-screen hidden md:block"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: hovered ? themeConfig.hoverSize : themeConfig.size,
          height: hovered ? themeConfig.hoverSize : themeConfig.size,
          borderColor: 'var(--color-realm-lavender)',
          boxShadow: hovered 
            ? '0 0 25px var(--color-realm-lavender)' 
            : '0 0 15px rgba(var(--color-realm-lavender), 0.15)',
          background: hovered 
            ? 'radial-gradient(circle, var(--color-realm-lavender) 0%, transparent 80%)' 
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 80%)'
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      />
    </>
  );
}
