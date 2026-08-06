import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, User, Film, UserPlus, Compass } from 'lucide-react';
import GlassPanel from './GlassPanel';
import socialApi from '../services/socialApi';
import { useNavigate } from 'react-router-dom';
import { useSocial } from '../hooks/useSocial';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], realms: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { sendFriendRequest } = useSocial();

  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], realms: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await socialApi.searchGlobal(query.trim());
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleJoinRealm = (code) => {
    onClose();
    navigate(`/realm/${code}`);
  };

  const handleAddFriend = async (userId) => {
    try {
      await sendFriendRequest(userId);
      alert('Friend request sent!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send request');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 w-full h-full flex items-center justify-center z-50 p-4 select-none">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          className="w-full max-w-lg relative z-10"
        >
          <GlassPanel className="p-6 border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.85)] bg-realm-navy-dark max-h-[85vh] flex flex-col text-left">
            
            {/* Search Input Bar */}
            <div className="relative mb-5">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-realm-moon-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users, realms, or friends..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl text-sm glass-input text-realm-moon placeholder-realm-moon-muted/40 focus:ring-1 focus:ring-realm-lavender/30"
                autoFocus
              />
              <button
                onClick={onClose}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-realm-moon-muted hover:text-realm-moon cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto scrollbar space-y-5 pr-1">
              {loading && <p className="text-xs text-realm-moon-muted text-center py-4">Searching community...</p>}

              {!loading && query && results.users.length === 0 && results.realms.length === 0 && (
                <p className="text-xs text-realm-moon-muted text-center py-6">No matching users or realms found</p>
              )}

              {/* Users Results */}
              {results.users.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider block mb-2 pl-1 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Users & Members ({results.users.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {results.users.map((u) => (
                      <div key={u._id} className="p-3 rounded-xl bg-[#07091B]/40 border border-realm-lavender/5 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img 
                            src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`} 
                            alt={u.username}
                            className="w-8 h-8 rounded-full border border-realm-lavender/20"
                          />
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-realm-moon">{u.displayName || u.username}</span>
                            <span className="text-[9px] text-realm-moon-muted">@{u.username}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddFriend(u._id)}
                          className="px-3 py-1 rounded-lg bg-realm-lavender/10 hover:bg-realm-lavender/20 text-realm-lavender text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Friend</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Realms Results */}
              {results.realms.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-realm-pink uppercase tracking-wider block mb-2 pl-1 flex items-center space-x-1">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Realms ({results.realms.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {results.realms.map((r) => (
                      <div key={r._id || r.code} className="p-3 rounded-xl bg-[#07091B]/40 border border-realm-lavender/5 flex items-center justify-between">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-realm-moon">{r.name || `Realm ${r.code}`}</span>
                          <span className="text-[9px] text-realm-moon-muted">Code: {r.code} • Theme: {r.theme || 'Moonlight'}</span>
                        </div>
                        <button
                          onClick={() => handleJoinRealm(r.code)}
                          className="px-3 py-1 rounded-lg bg-realm-pink/15 hover:bg-realm-pink/25 text-realm-pink text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Join Realm</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </GlassPanel>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
