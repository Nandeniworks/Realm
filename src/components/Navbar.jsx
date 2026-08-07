import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Info, Layers, Home, Bell, Users, Search, User } from 'lucide-react';
import { useSocial } from '../hooks/useSocial';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import FriendsDrawer from './FriendsDrawer';
import GlobalSearchModal from './GlobalSearchModal';
import ProfileModal from './ProfileModal';

export default function Navbar() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { unreadNotifCount } = useSocial();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const links = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Themes', path: '/#themes', icon: Layers },
    { name: 'About', path: '/#about', icon: Info },
  ];

  return (
    <>
      <motion.header 
        className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 select-none"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
      >
        <nav className="glass-panel py-3 px-6 md:px-8 rounded-full flex items-center justify-between w-full max-w-5xl border border-realm-lavender/10 shadow-[0_10px_30px_rgba(4,6,16,0.5)]">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-realm-lavender to-realm-pink flex items-center justify-center"
            >
              <Compass className="w-4 h-4 text-realm-navy-dark stroke-[2.5]" />
            </motion.div>
            <span className="text-xl font-semibold tracking-wide text-realm-moon font-sans bg-clip-text text-transparent bg-gradient-to-r from-realm-moon to-realm-lavender group-hover:from-realm-lavender group-hover:to-realm-pink transition-all duration-300">
              Realm
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <a
                  key={link.name}
                  href={link.path}
                  className="text-sm font-medium text-realm-moon-muted hover:text-realm-lavender transition-colors relative py-1"
                >
                  {link.name}
                  {isActive && (
                    <motion.span 
                      layoutId="navbar-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-realm-lavender to-realm-pink rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </div>

          {/* Social Platform Toolbar Actions */}
          <div className="flex items-center space-x-3.5">
            
            {/* Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-full border border-realm-lavender/10 hover:border-realm-lavender/30 text-realm-moon-muted hover:text-realm-moon transition-all cursor-pointer"
              title="Search community..."
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notification Trigger */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="p-2 rounded-full border border-realm-lavender/10 hover:border-realm-lavender/30 text-realm-moon-muted hover:text-realm-moon transition-all cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-realm-pink text-realm-navy-dark text-[9px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Friends Trigger */}
            <button
              onClick={() => setIsFriendsOpen(true)}
              className="p-2 rounded-full border border-realm-lavender/10 hover:border-realm-lavender/30 text-realm-moon-muted hover:text-realm-moon transition-all cursor-pointer"
              title="Social Lounge / Friends"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* Profile Avatar Trigger */}
            {currentUser && (
              <button
                onClick={() => setIsProfileOpen(true)}
                className="w-8 h-8 rounded-full border border-realm-lavender/30 overflow-hidden hover:scale-105 transition-all cursor-pointer shadow-sm p-0.5"
                title="Edit Profile"
              >
                <img 
                  src={currentUser.avatarUrl || currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover rounded-full"
                />
              </button>
            )}

            <Link to="/create">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-realm-lavender/10 hover:bg-realm-lavender/15 text-realm-lavender border border-realm-lavender/20 px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all cursor-pointer"
              >
                Start Room
              </motion.div>
            </Link>
          </div>
        </nav>
      </motion.header>

      {/* Modals & Drawers */}
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      <FriendsDrawer isOpen={isFriendsOpen} onClose={() => setIsFriendsOpen(false)} />
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
