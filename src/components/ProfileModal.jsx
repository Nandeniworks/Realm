import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Heart, Sparkles, Clock, Compass, Save, BarChart2, Shield, Eye, Globe } from 'lucide-react';
import GlassPanel from './GlassPanel';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';
import socialApi from '../services/socialApi';

const AVATAR_SEEDS = [
  { seed: 'Luna', label: 'Mystic' },
  { seed: 'Felix', label: 'Cosmic' },
  { seed: 'Milo', label: 'Library' },
  { seed: 'Daisy', label: 'Sanctuary' },
  { seed: 'Finn', label: 'Oceanic' },
  { seed: 'Sage', label: 'Forest' }
];

export default function ProfileModal({ isOpen, onClose }) {
  const { currentUser, updateProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState('profile'); // profile, stats, privacy
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [favouriteRealm, setFavouriteRealm] = useState('');
  const [favouriteGenre, setFavouriteGenre] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('Luna');
  const [privacySettings, setPrivacySettings] = useState({
    whoCanMessage: 'everyone',
    whoCanInvite: 'everyone',
    whoCanAddFriend: 'everyone',
    profileVisibility: 'public',
    activityVisibility: 'public'
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setBio(currentUser.bio || 'Exploring cinematic realms with friends ✨');
      setCountry(currentUser.country || 'Global');
      setFavouriteRealm(currentUser.favouriteRealm || 'Moonlight Academy');
      setFavouriteGenre(currentUser.favouriteGenre || 'Anime / Fantasy');
      if (currentUser.privacySettings) {
        setPrivacySettings(prev => ({ ...prev, ...currentUser.privacySettings }));
      }
      
      const match = currentUser.avatarUrl?.match(/seed=(.*)/) || currentUser.avatar?.match(/seed=(.*)/);
      if (match && match[1]) {
        setAvatarSeed(match[1]);
      }
    }
  }, [currentUser, isOpen]);

  if (!currentUser || !isOpen) return null;

  const handleSave = async () => {
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
    try {
      await socialApi.updateProfile({
        displayName,
        avatar: avatarUrl,
        bio,
        country,
        favouriteRealm,
        favouriteGenre,
        privacySettings
      });
      await updateProfile({
        displayName,
        avatarUrl,
        bio,
        country,
        favouriteRealm,
        favouriteGenre,
        privacySettings
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  const stats = currentUser.statistics || {
    moviesWatched: 12,
    hoursWatched: 28,
    friendsCount: currentUser.friends?.length || 0,
    realmsJoined: 5,
    messagesSent: 142,
    voiceCallHours: 16,
    videoCallHours: 8,
    favouriteTheme: 'Moonlight Academy'
  };

  const selectStyle = "w-full bg-[#07091B]/80 text-realm-moon text-xs rounded-xl p-2.5 border border-realm-lavender/10 focus:border-realm-lavender focus:outline-none transition-all cursor-pointer";
  const labelStyle = "text-[10px] font-bold text-realm-lavender uppercase tracking-wider block mb-1 pl-1";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 w-full h-full flex items-center justify-center z-50 p-4 select-none">
        <div className="absolute inset-0 bg-[#040610]/80 backdrop-blur-md" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-lg relative z-10"
        >
          <GlassPanel className="p-6 border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.85)] bg-realm-navy-dark max-h-[85vh] overflow-y-auto scrollbar text-left">
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-realm-moon-muted hover:text-realm-moon hover:bg-realm-navy-light/40 transition-all cursor-pointer z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Banner */}
            <div className="relative -mx-6 -mt-6 mb-5 h-28 overflow-hidden rounded-t-3xl border-b border-realm-lavender/10">
              <img 
                src={currentUser.banner || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80"} 
                alt="Banner" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-realm-navy-dark via-transparent to-black/30" />
              
              <div className="absolute bottom-2 left-6 flex items-end space-x-3">
                <div className="w-14 h-14 rounded-2xl bg-realm-navy-dark border-2 border-realm-lavender/40 overflow-hidden shadow-lg p-0.5">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} 
                    alt="Avatar" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="pb-1">
                  <h3 className="text-sm font-bold text-realm-moon">{displayName || currentUser.username}</h3>
                  <p className="text-[10px] text-realm-moon-muted">@{currentUser.username}</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-realm-lavender/5 mb-5 text-xs font-bold space-x-4">
              <button
                onClick={() => setActiveTab('profile')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'profile' ? 'border-realm-lavender text-realm-lavender' : 'border-transparent text-realm-moon-muted'
                }`}
              >
                Profile & Bio
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'stats' ? 'border-realm-lavender text-realm-lavender' : 'border-transparent text-realm-moon-muted'
                }`}
              >
                Statistics
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'privacy' ? 'border-realm-lavender text-realm-lavender' : 'border-transparent text-realm-moon-muted'
                }`}
              >
                Privacy & Controls
              </button>
            </div>

            {/* Tab 1: Profile & Bio */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                
                {/* Avatar options */}
                <div>
                  <label className={labelStyle}>Avatar Style</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {AVATAR_SEEDS.map((av) => (
                      <button
                        key={av.seed}
                        onClick={() => setAvatarSeed(av.seed)}
                        className={`px-3 py-1.5 rounded-xl text-xs border font-medium transition-all ${
                          avatarSeed === av.seed
                            ? 'bg-realm-lavender/15 border-realm-lavender text-realm-lavender'
                            : 'border-realm-lavender/10 text-realm-moon-muted hover:text-realm-moon'
                        }`}
                      >
                        {av.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className={labelStyle}>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-realm-moon"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className={labelStyle}>Bio</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-realm-moon resize-none"
                  />
                </div>

                {/* Country & Favourites */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelStyle}>Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input text-realm-moon"
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Favourite Genre</label>
                    <input
                      type="text"
                      value={favouriteGenre}
                      onChange={(e) => setFavouriteGenre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input text-realm-moon"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>Favourite Realm</label>
                  <input
                    type="text"
                    value={favouriteRealm}
                    onChange={(e) => setFavouriteRealm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input text-realm-moon"
                  />
                </div>

              </div>
            )}

            {/* Tab 2: Statistics */}
            {activeTab === 'stats' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-[#07091B]/40 border border-realm-lavender/5 flex flex-col">
                    <span className="text-[10px] text-realm-moon-muted">Movies Watched</span>
                    <span className="text-base font-bold text-realm-lavender mt-1">{stats.moviesWatched}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#07091B]/40 border border-realm-lavender/5 flex flex-col">
                    <span className="text-[10px] text-realm-moon-muted">Hours Watched</span>
                    <span className="text-base font-bold text-realm-pink mt-1">{stats.hoursWatched} hrs</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#07091B]/40 border border-realm-lavender/5 flex flex-col">
                    <span className="text-[10px] text-realm-moon-muted">Friends</span>
                    <span className="text-base font-bold text-emerald-400 mt-1">{stats.friendsCount}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#07091B]/40 border border-realm-lavender/5 flex flex-col">
                    <span className="text-[10px] text-realm-moon-muted">Realms Joined</span>
                    <span className="text-base font-bold text-realm-gold mt-1">{stats.realmsJoined}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#07091B]/40 border border-realm-lavender/5 flex flex-col">
                    <span className="text-[10px] text-realm-moon-muted">Messages Sent</span>
                    <span className="text-base font-bold text-realm-lavender mt-1">{stats.messagesSent}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#07091B]/40 border border-realm-lavender/5 flex flex-col">
                    <span className="text-[10px] text-realm-moon-muted">Voice Call Hours</span>
                    <span className="text-base font-bold text-purple-400 mt-1">{stats.voiceCallHours} hrs</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Privacy & Controls */}
            {activeTab === 'privacy' && (
              <div className="space-y-3 bg-[#07091B]/40 p-4 rounded-2xl border border-realm-lavender/5 text-xs">
                <div>
                  <label className={labelStyle}>Who Can Message You</label>
                  <select
                    value={privacySettings.whoCanMessage}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, whoCanMessage: e.target.value })}
                    className={selectStyle}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends Only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>Who Can Invite You</label>
                  <select
                    value={privacySettings.whoCanInvite}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, whoCanInvite: e.target.value })}
                    className={selectStyle}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends Only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>Who Can Add You As Friend</label>
                  <select
                    value={privacySettings.whoCanAddFriend}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, whoCanAddFriend: e.target.value })}
                    className={selectStyle}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends of Friends</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-realm-moon-muted hover:text-realm-moon cursor-pointer"
              >
                Cancel
              </button>
              <Button
                onClick={handleSave}
                variant="primary"
                icon={Save}
                className="w-32 py-2 text-xs h-auto cursor-pointer"
              >
                {saveSuccess ? 'Saved!' : 'Save Profile'}
              </Button>
            </div>

          </GlassPanel>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
export { ProfileModal };
