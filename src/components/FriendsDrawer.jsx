import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, UserPlus, Check, Trash2, Send, Film, Mic, Radio, Search } from 'lucide-react';
import { useSocial } from '../hooks/useSocial';
import socialApi from '../services/socialApi';
import GlassPanel from './GlassPanel';
import Button from './Button';
import { useParams } from 'react-router-dom';

export default function FriendsDrawer({ isOpen, onClose }) {
  const { 
    friends, 
    pendingRequests, 
    sendFriendRequest, 
    respondFriendRequest, 
    removeFriend, 
    sendInvite,
    userPresence,
    setPresence
  } = useSocial();

  const { id: currentRoomCode } = useParams();
  const [targetUsername, setTargetUsername] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, status

  if (!isOpen) return null;

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!targetUsername.trim()) return;

    try {
      // Find target user by username via global search
      const data = await socialApi.searchGlobal(targetUsername.trim());
      const matchedUser = data.users?.find(u => u.username.toLowerCase() === targetUsername.trim().toLowerCase());

      if (!matchedUser) {
        setRequestStatus('User not found');
        return;
      }

      await sendFriendRequest(matchedUser._id);
      setRequestStatus('Request sent!');
      setTargetUsername('');
      setTimeout(() => setRequestStatus(''), 2500);
    } catch (err) {
      setRequestStatus(err.message || 'Failed to send request');
    }
  };

  const handleInviteToCurrentRealm = async (friendId) => {
    if (!currentRoomCode) {
      alert('Join a Realm first to invite friends!');
      return;
    }

    try {
      await sendInvite({
        receiverId: friendId,
        realmCode: currentRoomCode,
        type: 'realm',
        realmName: `Realm ${currentRoomCode}`
      });
      alert('Invitation sent!');
    } catch (err) {
      alert('Failed to send invite');
    }
  };

  // Status mapping colors & icons
  const presenceBadges = {
    online: { label: 'Online', color: 'bg-emerald-400 text-emerald-900', ring: 'ring-emerald-400' },
    offline: { label: 'Offline', color: 'bg-gray-500 text-gray-200', ring: 'ring-gray-500' },
    away: { label: 'Away', color: 'bg-amber-400 text-amber-950', ring: 'ring-amber-400' },
    watching: { label: 'Watching 🎬', color: 'bg-realm-lavender text-realm-navy-dark', ring: 'ring-realm-lavender' },
    in_voice: { label: 'In Voice Call 🎤', color: 'bg-purple-400 text-purple-950', ring: 'ring-purple-400' },
    in_realm: { label: 'In Realm 🔮', color: 'bg-realm-pink text-realm-navy-dark', ring: 'ring-realm-pink' },
    dnd: { label: 'Do Not Disturb', color: 'bg-red-500 text-white', ring: 'ring-red-500' },
    invisible: { label: 'Invisible', color: 'bg-slate-600 text-slate-200', ring: 'ring-slate-600' },
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 w-full h-full flex items-start justify-end z-50 p-4 md:p-6 select-none">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-sm relative z-10 mt-16"
        >
          <GlassPanel className="p-5 border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.85)] bg-realm-navy-dark max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-realm-lavender/5 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-realm-lavender" />
                <h3 className="text-sm font-bold text-realm-moon uppercase tracking-wider">Social Lounge</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-realm-moon-muted hover:text-realm-moon hover:bg-realm-navy-light/40 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-realm-lavender/5 mb-3.5 text-xs font-bold space-x-4">
              <button
                onClick={() => setActiveTab('friends')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'friends' ? 'border-realm-lavender text-realm-lavender' : 'border-transparent text-realm-moon-muted'
                }`}
              >
                Friends ({friends.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center space-x-1 ${
                  activeTab === 'requests' ? 'border-realm-lavender text-realm-lavender' : 'border-transparent text-realm-moon-muted'
                }`}
              >
                <span>Requests</span>
                {pendingRequests.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-realm-pink text-realm-navy-dark text-[9px]">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'status' ? 'border-realm-lavender text-realm-lavender' : 'border-transparent text-realm-moon-muted'
                }`}
              >
                My Status
              </button>
            </div>

            {/* Tab: Friends */}
            {activeTab === 'friends' && (
              <div className="flex-1 overflow-y-auto scrollbar space-y-3 pr-1">
                
                {/* Send Request Form */}
                <form onSubmit={handleSendRequest} className="space-y-1.5 mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Add friend by username..."
                      value={targetUsername}
                      onChange={(e) => setTargetUsername(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl text-xs glass-input text-realm-moon placeholder-realm-moon-muted/30 focus:ring-1 focus:ring-realm-lavender/25"
                    />
                    <Button variant="primary" type="submit" className="py-2 px-3 text-xs h-auto" icon={UserPlus}>
                      Add
                    </Button>
                  </div>
                  {requestStatus && <p className="text-[10px] text-realm-lavender font-medium pl-1">{requestStatus}</p>}
                </form>

                {friends.length === 0 ? (
                  <div className="py-8 text-center space-y-1">
                    <Users className="w-8 h-8 text-realm-moon-muted/20 mx-auto" />
                    <p className="text-xs text-realm-moon-muted">No friends added yet</p>
                  </div>
                ) : (
                  friends.map((friend) => {
                    const badge = presenceBadges[friend.presenceStatus || 'online'] || presenceBadges.online;
                    return (
                      <div 
                        key={friend._id}
                        className="p-3 rounded-xl bg-[#07091B]/40 border border-realm-lavender/5 flex items-center justify-between hover:border-realm-lavender/20 transition-all"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="relative">
                            <img 
                              src={friend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`}
                              alt={friend.username}
                              className="w-8 h-8 rounded-full object-cover border border-realm-lavender/20"
                            />
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${badge.color} ring-2 ring-realm-navy-dark`} />
                          </div>
                          <div className="flex flex-col min-w-0 text-left">
                            <span className="text-xs font-bold text-realm-moon truncate">{friend.displayName || friend.username}</span>
                            <span className="text-[9px] text-realm-moon-muted truncate">{badge.label}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          {currentRoomCode && (
                            <button
                              onClick={() => handleInviteToCurrentRealm(friend._id)}
                              className="p-1.5 rounded-lg bg-realm-lavender/10 hover:bg-realm-lavender/20 text-realm-lavender transition-all cursor-pointer"
                              title="Invite to this Realm"
                            >
                              <Film className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => removeFriend(friend._id)}
                            className="p-1.5 rounded-lg text-realm-moon-muted hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Remove Friend"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab: Requests */}
            {activeTab === 'requests' && (
              <div className="flex-1 overflow-y-auto scrollbar space-y-2 pr-1">
                {pendingRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-realm-moon-muted">No pending friend requests</div>
                ) : (
                  pendingRequests.map((req) => (
                    <div 
                      key={req._id}
                      className="p-3 rounded-xl bg-[#07091B]/40 border border-realm-lavender/5 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img 
                          src={req.sender.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.sender.username}`}
                          alt={req.sender.username}
                          className="w-8 h-8 rounded-full border border-realm-lavender/20"
                        />
                        <span className="text-xs font-bold text-realm-moon truncate">{req.sender.displayName || req.sender.username}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="primary"
                          onClick={() => respondFriendRequest(req._id, 'accept')}
                          className="py-1 px-2.5 text-[10px] h-auto"
                          icon={Check}
                        >
                          Accept
                        </Button>
                        <button
                          onClick={() => respondFriendRequest(req._id, 'decline')}
                          className="px-2 py-1 rounded-lg border border-realm-lavender/10 text-[10px] text-realm-moon-muted hover:text-realm-moon cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Status Picker */}
            {activeTab === 'status' && (
              <div className="flex-1 overflow-y-auto scrollbar space-y-2 pr-1 text-left">
                <label className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider block mb-2 pl-1">
                  Select Presence Status
                </label>
                {Object.entries(presenceBadges).map(([key, badge]) => (
                  <button
                    key={key}
                    onClick={() => setPresence(key)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      userPresence === key ? 'bg-realm-lavender/15 border-realm-lavender text-realm-moon' : 'border-realm-lavender/5 hover:border-realm-lavender/15 text-realm-moon-muted'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-3 h-3 rounded-full ${badge.color}`} />
                      <span className="text-xs font-semibold">{badge.label}</span>
                    </div>
                    {userPresence === key && <Check className="w-4 h-4 text-realm-lavender" />}
                  </button>
                ))}
              </div>
            )}

          </GlassPanel>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
