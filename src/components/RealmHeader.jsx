import React from 'react';
import { motion } from 'framer-motion';

export default function RealmHeader({ realmName = "Night Owl Cinema" }) {
  return (
    <div className="flex flex-col text-left space-y-1">
      <motion.h1 
        className="text-2xl md:text-3xl font-semibold tracking-tight text-realm-moon font-sans"
        layoutId="realm-header-title"
      >
        {realmName}
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-xs md:text-sm text-realm-moon-muted font-sans font-medium italic opacity-85"
      >
        &ldquo;Connected in a shared digital room.&rdquo;
      </motion.p>
    </div>
  );
}
