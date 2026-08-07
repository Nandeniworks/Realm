import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['✨', '❤️', '😂', '😮', '🍿', '🔥', '👏', '😴'];

export default function ReactionBar({ onReact }) {
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  const triggerReaction = (emoji) => {
    // Call the callback if it exists
    if (onReact) onReact(emoji);

    // Create a new floating emoji instance with a unique ID and random offsets
    const id = Date.now() + Math.random();
    const newEmoji = {
      id,
      char: emoji,
      x: Math.random() * 80 - 40, // Random drift left/right
      scale: Math.random() * 0.4 + 0.8,
    };

    setFloatingEmojis((prev) => [...prev, newEmoji]);

    // Clean up after animation finishes (2 seconds)
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2000);
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Floating Reactions Container (rendered relative to this bar, floating upwards) */}
      <div className="absolute bottom-16 pointer-events-none w-32 h-64 overflow-visible flex justify-center">
        <AnimatePresence>
          {floatingEmojis.map((emoji) => (
            <motion.div
              key={emoji.id}
              initial={{ opacity: 0, y: 0, scale: 0.5, rotate: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                y: -180, 
                x: emoji.x,
                scale: [0.5, emoji.scale, emoji.scale, 0.4],
                rotate: emoji.x * 0.6
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute text-2xl filter drop-shadow-[0_4px_10px_rgba(4,6,16,0.3)]"
            >
              {emoji.char}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Actual Emoji Bar Panel */}
      <div className="flex items-center space-x-1.5 p-1.5 rounded-2xl bg-realm-navy-dark/60 border border-realm-lavender/10 backdrop-blur-md shadow-lg">
        {EMOJIS.map((emoji, index) => (
          <motion.button
            key={index}
            type="button"
            onClick={() => triggerReaction(emoji)}
            whileHover={{ scale: 1.25, y: -2 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 flex items-center justify-center text-base hover:bg-realm-lavender/10 rounded-xl transition-colors cursor-pointer select-none"
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
