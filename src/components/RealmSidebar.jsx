import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Settings, UserPlus, Trash2, LogOut, Edit3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MemberCard from './MemberCard';
import GlassCard from './GlassCard';
import ProfileModal from './ProfileModal';
import { useAuth } from '../contexts/AuthContext';
import { useRealm } from '../contexts/RealmContext';
import JoinVoiceOverlay from '../call/components/JoinVoiceOverlay';

export default function RealmSidebar({ 
  onOpenInvite,
  onOpenRoomSettings,
  liveMembers = [],
  onMuteMember
}) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { currentUser } = useAuth();
  const { currentRealm, updateRealm, leaveRealm, deleteRealm } = useRealm();

  const members = liveMembers.length > 0 ? liveMembers : (currentRealm?.currentMembers || []);
  const totalCount = members.length;

  const requesterUserId = currentUser?._id || currentUser?.uid || currentUser?.id;
  const realmName = currentRealm?.name || 'Cinema Lounge';
  const realmCode = currentRealm?.code || currentRealm?.inviteCode || '';
  
  const isOwner = currentRealm?.owner?.toString() === requesterUserId?.toString() || 
                  currentRealm?.ownerId?.toString() === requesterUserId?.toString();
  
  const isAdmin = currentRealm?.admins?.some(a => a.toString() === requesterUserId?.toString());

  const memberIsAdmin = (m) => {
    const targetId = m.userId || m.id;
    return currentRealm?.admins?.some(a => a.toString() === targetId?.toString());
  };

  const canManageMember = (m) => {
    const targetId = m.userId || m.id;
    if (!targetId || !requesterUserId) return false;
    if (targetId.toString() === requesterUserId.toString()) return false;
    
    const targetIsOwner = currentRealm?.owner?.toString() === targetId.toString() || 
                          currentRealm?.ownerId?.toString() === targetId.toString();
    if (targetIsOwner) return false;
    
    if (isOwner) return true;
    if (isAdmin && !memberIsAdmin(m)) return true;
    return false;
  };

  const handlePromoteAdmin = async (m) => {
    try {
      const targetId = m.userId || m.id;
      await updateRealm(currentRealm.code, { action: 'promote', userId: targetId });
    } catch (err) {
      console.error('Failed to promote admin:', err);
    }
  };

  const handleDemoteAdmin = async (m) => {
    try {
      const targetId = m.userId || m.id;
      await updateRealm(currentRealm.code, { action: 'demote', userId: targetId });
    } catch (err) {
      console.error('Failed to demote admin:', err);
    }
  };

  const handleTransferOwnership = async (m) => {
    try {
      const targetId = m.userId || m.id;
      if (window.confirm(`Are you sure you want to transfer ownership to ${m.name}?`)) {
        await updateRealm(currentRealm.code, { action: 'transferOwnership', userId: targetId });
      }
    } catch (err) {
      console.error('Failed to transfer ownership:', err);
    }
  };

  const handleKickMember = async (m) => {
    try {
      const targetId = m.userId || m.id;
      if (window.confirm(`Are you sure you want to remove ${m.name} from the realm?`)) {
        await updateRealm(currentRealm.code, { action: 'kick', userId: targetId });
      }
    } catch (err) {
      console.error('Failed to kick member:', err);
    }
  };

  const handleLeaveRealm = async () => {
    try {
      if (window.confirm('Are you sure you want to leave this lounge?')) {
        await leaveRealm(currentRealm.code || currentRealm.realmId);
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to leave realm:', err);
    }
  };

  const handleDeleteRealm = async () => {
    try {
      if (window.confirm('Are you sure you want to permanently delete this lounge? This action cannot be undone.')) {
        await deleteRealm(currentRealm.realmId || currentRealm.code);
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to delete realm:', err);
    }
  };

  return (
    <>
      <GlassCard className="h-full flex flex-col justify-between p-4 md:p-5 overflow-hidden">
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          
          {/* Top navigation & room identity block */}
          <div className="flex items-center justify-between pb-3 border-b border-realm-lavender/10">
            <Link to="/">
              <span className="text-xs font-semibold text-realm-lavender hover:underline">← Lobby</span>
            </Link>
            
            <div className="text-right">
              <h2 className="text-sm font-bold text-realm-moon leading-tight truncate max-w-[140px]">
                {realmName}
              </h2>
              <span className="text-[10px] text-realm-lavender font-mono">
                #{realmCode}
              </span>
            </div>
          </div>

          {/* User Profile Identifier Card */}
          {currentUser && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-realm-navy-light/35 border border-realm-lavender/5">
              <div className="flex items-center space-x-2.5 min-w-0">
                <img 
                  src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`} 
                  alt="avatar" 
                  className="w-8 h-8 rounded-lg shrink-0 border border-realm-lavender/10" 
                />
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-bold text-realm-moon truncate">
                    {currentUser.displayName || currentUser.username}
                  </span>
                  <span className="text-[9px] text-realm-moon-muted capitalize">
                    Active User
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setIsProfileOpen(true)}
                className="p-2 rounded-xl text-realm-moon-muted hover:text-realm-lavender hover:bg-realm-navy-light/40 transition-all cursor-pointer shrink-0"
                title="Edit Profile"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Voice Overlay Banner */}
          <JoinVoiceOverlay liveMembers={liveMembers} />

          {/* Members section */}
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-realm-lavender/80 uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Online Members</span>
              </h3>
              
              <motion.span 
                key={totalCount}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-realm-lavender/10 text-realm-lavender border border-realm-lavender/5"
              >
                {totalCount} active
              </motion.span>
            </div>

            {/* Live Avatars/Cards */}
            <div className="space-y-2.5 overflow-y-auto scrollbar pr-1 flex-1">
              <AnimatePresence initial={false}>
                {members.map((member) => (
                  <motion.div
                    key={member.socketId || member.userId || member.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className="flex items-center space-x-1"
                  >
                    <div className="flex-1 min-w-0">
                      <MemberCard
                        name={member.name}
                        status={member.status}
                        statusType={member.statusType}
                        color={member.color}
                        role={member.role}
                        inCall={member.inCall}
                        micMuted={member.micMuted}
                        cameraEnabled={member.cameraEnabled}
                        screenSharing={member.screenSharing}
                        speaking={member.speaking}
                        avatarUrl={member.avatar}
                      />
                    </div>
                    
                    {/* Member action controls */}
                    {canManageMember(member) && (
                      <div className="flex flex-col space-y-0.5 shrink-0 bg-realm-navy-dark/40 border border-realm-lavender/5 rounded-lg p-0.5">
                        {isOwner && !memberIsAdmin(member) && (
                          <button
                            onClick={() => handlePromoteAdmin(member)}
                            className="p-1 rounded text-realm-moon-muted hover:text-realm-lavender hover:bg-realm-navy-light/40 transition-all cursor-pointer text-[9px] font-bold"
                            title="Promote to Admin"
                          >
                            +Admin
                          </button>
                        )}
                        {isOwner && memberIsAdmin(member) && (
                          <button
                            onClick={() => handleDemoteAdmin(member)}
                            className="p-1 rounded text-realm-moon-muted hover:text-realm-pink hover:bg-realm-navy-light/40 transition-all cursor-pointer text-[9px] font-bold"
                            title="Demote Admin"
                          >
                            -Admin
                          </button>
                        )}
                        {isOwner && (
                          <button
                            onClick={() => handleTransferOwnership(member)}
                            className="p-1 rounded text-realm-moon-muted hover:text-realm-gold hover:bg-realm-navy-light/40 transition-all cursor-pointer text-[9px] font-bold"
                            title="Make Owner"
                          >
                            +Owner
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (onMuteMember) onMuteMember(member.name);
                          }}
                          className="p-1 rounded text-realm-moon-muted hover:text-amber-400 hover:bg-realm-navy-light/40 transition-all cursor-pointer text-[9px] font-bold"
                          title="Mute for 5 mins"
                        >
                          Mute
                        </button>
                        <button
                          onClick={() => handleKickMember(member)}
                          className="p-1 rounded text-realm-moon-muted hover:text-red-400 hover:bg-realm-navy-light/40 transition-all cursor-pointer text-[9px] font-bold"
                          title="Kick"
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer controls: Invite & Settings */}
        <div className="space-y-3 pt-3 border-t border-realm-lavender/5">
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-realm-navy-dark/40 border border-realm-lavender/10 rounded-2xl p-3 text-left space-y-2"
              >
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      if (onOpenRoomSettings) onOpenRoomSettings();
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border border-realm-lavender/20 bg-realm-lavender/10 text-realm-lavender hover:bg-realm-lavender/20 transition-all text-xs font-bold cursor-pointer mb-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Room Settings</span>
                  </button>

                  {isOwner ? (
                    <button
                      onClick={handleDeleteRealm}
                      className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/25 hover:border-red-500/35 transition-all text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Lounge</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleLeaveRealm}
                      className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/25 hover:border-red-500/35 transition-all text-xs font-bold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Leave Lounge</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex space-x-2">
            <button
              onClick={onOpenInvite}
              className="flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-2xl bg-realm-lavender text-realm-navy-dark hover:bg-white transition-all text-xs font-bold shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Invite Friends</span>
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                showSettings 
                  ? 'bg-realm-lavender/10 border-realm-lavender text-realm-lavender shadow-md' 
                  : 'border-realm-lavender/10 hover:border-realm-lavender/25 text-realm-moon-muted hover:text-realm-moon'
              }`}
              title="Lounge Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </GlassCard>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </>
  );
}
