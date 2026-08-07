import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, UserPlus, Film, Mic, CheckCircle, Sparkles, Check, Trash2 } from 'lucide-react';
import { useSocial } from '../hooks/useSocial';
import GlassPanel from './GlassPanel';
import Button from './Button';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter({ isOpen, onClose }) {
  const { notifications, unreadNotifCount, markNotificationsRead, respondFriendRequest } = useSocial();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAction = async (notif, action) => {
    if (notif.type === 'friend_request' && notif.data?.requestId) {
      await respondFriendRequest(notif.data.requestId, action);
    }
  };

  const handleJoinInvite = (realmCode) => {
    if (realmCode) {
      onClose();
      navigate(`/realm/${realmCode}`);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'friend_request': return <UserPlus className="w-4 h-4 text-realm-lavender" />;
      case 'realm_invite': return <Film className="w-4 h-4 text-realm-pink" />;
      case 'voice_invite': return <Mic className="w-4 h-4 text-emerald-400" />;
      case 'movie_starting': return <Sparkles className="w-4 h-4 text-realm-gold" />;
      default: return <Bell className="w-4 h-4 text-realm-lavender" />;
    }
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
          <GlassPanel className="p-5 border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.85)] bg-realm-navy-dark max-h-[80vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-realm-lavender/5 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-realm-lavender" />
                <h3 className="text-sm font-bold text-realm-moon uppercase tracking-wider">Notifications</h3>
                {unreadNotifCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-realm-pink text-realm-navy-dark text-[10px] font-extrabold">
                    {unreadNotifCount}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {unreadNotifCount > 0 && (
                  <button
                    onClick={markNotificationsRead}
                    className="text-[10px] text-realm-lavender hover:underline cursor-pointer font-semibold"
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-realm-moon-muted hover:text-realm-moon hover:bg-realm-navy-light/40 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification items list */}
            <div className="overflow-y-auto scrollbar space-y-2.5 pr-1 flex-1">
              {notifications.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Bell className="w-8 h-8 text-realm-moon-muted/30 mx-auto" />
                  <p className="text-xs text-realm-moon-muted">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif._id || notif.createdAt}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      notif.read ? 'bg-[#07091B]/40 border-realm-lavender/5' : 'bg-realm-navy-light/20 border-realm-lavender/20 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className="p-2 rounded-lg bg-realm-navy-dark border border-realm-lavender/10 shrink-0 mt-0.5">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-realm-moon truncate">{notif.title}</h4>
                          <span className="text-[9px] text-realm-moon-muted">
                            {new Date(notif.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-realm-moon-muted mt-1 leading-relaxed">{notif.message}</p>

                        {/* Inline actions for Friend Requests or Invites */}
                        {notif.type === 'friend_request' && notif.data?.requestId && (
                          <div className="flex items-center space-x-2 mt-2.5">
                            <Button
                              variant="primary"
                              onClick={() => handleAction(notif, 'accept')}
                              className="py-1 px-3 text-[10px] h-auto"
                              icon={Check}
                            >
                              Accept
                            </Button>
                            <button
                              onClick={() => handleAction(notif, 'decline')}
                              className="px-2.5 py-1 rounded-lg border border-realm-lavender/10 hover:bg-realm-navy-light/40 text-[10px] text-realm-moon-muted hover:text-realm-moon cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {(notif.type === 'realm_invite' || notif.type === 'voice_invite') && notif.data?.realmCode && (
                          <div className="mt-2.5">
                            <Button
                              variant="primary"
                              onClick={() => handleJoinInvite(notif.data.realmCode)}
                              className="py-1 px-3 text-[10px] h-auto"
                              icon={Film}
                            >
                              Join Realm ({notif.data.realmCode})
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </GlassPanel>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
