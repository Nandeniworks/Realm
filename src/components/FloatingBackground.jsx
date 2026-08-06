import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function FloatingBackground() {
  const [stars, setStars] = useState([]);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate stars
    const newStars = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 80, // Keep stars mostly in the upper sky
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 2,
    }));
    setStars(newStars);

    // Generate floating particles
    const newParticles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 8,
      duration: Math.random() * 20 + 15,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#040610]">
      {/* 1. Animated Gradient Sky */}
      <div 
        className="absolute inset-0 opacity-40 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle at 50% 20%, #171b3e 0%, #0d0f22 50%, #040610 100%)'
        }}
      />
      <div 
        className="absolute inset-0 opacity-20 mix-blend-screen blur-[100px]"
        style={{
          background: 'radial-gradient(circle at 10% 30%, #e8a7a1 0%, transparent 40%), radial-gradient(circle at 90% 70%, #d1d5fc 0%, transparent 40%)'
        }}
      />

      {/* 2. Soft Floating Clouds */}
      <motion.div 
        className="absolute w-[600px] h-[300px] rounded-full bg-[#1b1e3d] opacity-[0.12] blur-[80px]"
        animate={{
          x: [-200, 1200],
          y: [100, 150],
        }}
        transition={{
          duration: 90,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.div 
        className="absolute w-[800px] h-[400px] rounded-full bg-[#3d2645] opacity-[0.08] blur-[100px]"
        animate={{
          x: [1200, -400],
          y: [200, 250],
        }}
        transition={{
          duration: 120,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.div 
        className="absolute w-[500px] h-[250px] rounded-full bg-[#131835] opacity-[0.15] blur-[70px]"
        animate={{
          x: [-300, 1100],
          y: [400, 450],
        }}
        transition={{
          duration: 70,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* 3. Twinkling Stars */}
      {stars.map((star) => (
        <motion.div
          key={`star-${star.id}`}
          className="absolute rounded-full bg-white opacity-0"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
          }}
          animate={{
            opacity: [0, 0.7, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* 4. Floating Particles */}
      {particles.map((p) => (
        <motion.div
          key={`p-${p.id}`}
          className="absolute rounded-full bg-realm-lavender opacity-0"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            filter: 'blur(1px)',
            boxShadow: '0 0 6px rgba(195, 201, 255, 0.4)',
          }}
          animate={{
            y: [0, -300],
            x: [0, Math.sin(p.id) * 40],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}

      {/* Ambient overlay to soften everything */}
      <div className="absolute inset-0 bg-gradient-to-t from-realm-navy-dark via-transparent to-transparent opacity-80" />
    </div>
  );
}
