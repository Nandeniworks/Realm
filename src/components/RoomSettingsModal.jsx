import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Shield, Lock, Unlock, Users, MessageSquare, Smile, ListPlus, Play, Check, Crown, UserMinus, UserCheck, Clock, Image, FileText } from 'lucide-react';
import { useRealm } from '../contexts/RealmContext';
import { useAuth } from '../contexts/AuthContext';
import GlassPanel from './GlassPanel';
import Button from './Button';

export default function RoomSettingsModal({ isOpen, onClose }) {
  const { currentRealm, updateRealm } = useRealm();
  const { currentUser } = useAuth();

  const requesterId = currentUser?._id || currentUser?.uid;
  const isOwner = currentRealm?.owner?.toString() === requesterId?.toString() || 
                  currentRealm?.ownerId?.toString() === requesterId?.toString();
  const isAdmin = currentRealm?.admins?.some(a => a.toString() === requesterId?.toString());
  const canEdit = isOwner || isAdmin;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverImage: '',
    privacy: 'public',
    maxMembers: 8,
    allowChat: true,
    allowReactions: true,
    allowQueueEditing: true,
    allowPlaybackControl: true,
    requireApproval: false
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings'); // settings, info, members, requests

  useEffect(() => {
    if (currentRealm) {
      setFormData({
        name: currentRealm.name || '',
        description: currentRealm.description || '',
        coverImage: currentRealm.coverImage || '',
        privacy: currentRealm.privacy || 'public',
        maxMembers: currentRealm.maxMembers || 8,
        allowChat: currentRealm.allowChat !== undefined ? currentRealm.allowChat : true,
        allowReactions: currentRealm.allowReactions !== undefined ? currentRealm.allowReactions : true,
        allowQueueEditing: currentRealm.allowQueueEditing !== undefined ? currentRealm.allowQueueEditing : true,
        allowPlaybackControl: currentRealm.allowPlaybackControl !== undefined ? currentRealm.allowPlaybackControl : true,
        requireApproval: currentRealm.requireApproval !== undefined ? currentRealm.requireApproval : false
      });
    }
  }, [currentRealm, isOpen]);

  if (!isOpen || !currentRealm) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      await updateRealm(currentRealm.code || currentRealm.realmId, formData);
      onClose();
    } catch (err) {
      console.error('Failed to save room settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await updateRealm(currentRealm.code || currentRealm.realmId, { action: 'approveJoin', userId });
    } catch (err) {
      console.error('Failed to approve join request:', err);
    }
  };

  const handleReject = async (userId) => {
    try {
      await updateRealm(currentRealm.code || currentRealm.realmId, { action: 'rejectJoin', userId });
    } catch (err) {
      console.error('Failed to reject join request:', err);
    }
  };

  const handleTransfer = async (member) => {
    const targetId = member.userId || member.id;
    if (window.confirm(`Transfer host ownership to ${member.name}?`)) {
      try {
        await updateRealm(currentRealm.code || currentRealm.realmId, { action: 'transferOwnership', userId: targetId });
      } catch (err) {
        console.error('Failed to transfer ownership:', err);
      }
    }
  };

  const handleKick = async (member) => {
    const targetId = member.userId || member.id;
    if (window.confirm(`Remove ${member.name} from this room?`)) {
      try {
        await updateRealm(currentRealm.code || currentRealm.realmId, { action: 'kick', userId: targetId });
      } catch (err) {
        console.error('Failed to remove member:', err);
      }
    }
  };

  const createdTimeFormatted = currentRealm.createdAt 
    ? new Date(currentRealm.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';

  const pendingRequests = currentRealm.pendingRequests || [];
  const currentMembersList = currentRealm.currentMembers || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#040610]/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-full max-w-xl max-h-[85vh] flex flex-col glass-panel border border-realm-lavender/10 shadow-[0_25px_60px_rgba(4,6,16,0.9)] p-6 rounded-3xl z-10 bg-realm-navy-dark overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-realm-lavender/10 pb-4 mb-4">
            <div className="flex items-center space-x-2 text-left">
              <div className="w-8 h-8 rounded-xl bg-realm-lavender/10 border border-realm-lavender/25 text-realm-lavender flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-realm-moon font-sans">
                  {canEdit ? 'Room Management' : 'Room Information'}
                </h3>
                <span className="text-[10px] text-realm-moon-muted">
                  {canEdit ? 'Configure room settings & members' : 'Read-only room details'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-realm-moon-muted hover:text-realm-moon hover:bg-realm-navy-light/40 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-realm-lavender/10 mb-4 space-x-4 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-realm-lavender text-realm-lavender'
                  : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'info'
                  ? 'border-realm-lavender text-realm-lavender'
                  : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
              }`}
            >
              Information
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`pb-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'members'
                      ? 'border-realm-lavender text-realm-lavender'
                      : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
                  }`}
                >
                  Members ({currentMembersList.length})
                </button>
                {formData.requireApproval && (
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center space-x-1 ${
                      activeTab === 'requests'
                        ? 'border-realm-lavender text-realm-lavender'
                        : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
                    }`}
                  >
                    <span>Requests</span>
                    {pendingRequests.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-realm-pink text-realm-navy-dark text-[9px] font-bold">
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar space-y-4 text-left">
            
            {/* TAB: Room Settings */}
            {activeTab === 'settings' && (
              <form onSubmit={handleSave} className="space-y-4">
                {/* Room Name */}
                <div>
                  <label className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider block mb-1">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!canEdit}
                    className="w-full bg-[#040610] text-realm-moon text-xs rounded-xl p-3 border border-realm-lavender/10 focus:border-realm-lavender focus:outline-none transition-all disabled:opacity-60"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider block mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={!canEdit}
                    placeholder="Tell guests what this watch party is about..."
                    className="w-full bg-[#040610] text-realm-moon text-xs rounded-xl p-3 border border-realm-lavender/10 focus:border-realm-lavender focus:outline-none transition-all disabled:opacity-60 h-20 resize-none"
                  />
                </div>

                {/* Cover Image URL */}
                <div>
                  <label className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider block mb-1">
                    Cover Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    disabled={!canEdit}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full bg-[#040610] text-realm-moon text-xs rounded-xl p-3 border border-realm-lavender/10 focus:border-realm-lavender focus:outline-none transition-all disabled:opacity-60"
                  />
                </div>

                {/* Privacy & Max Members */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider block mb-1">
                      Privacy
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => canEdit && setFormData({ ...formData, privacy: 'public' })}
                        className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                          formData.privacy === 'public'
                            ? 'bg-realm-lavender/10 border-realm-lavender text-realm-lavender'
                            : 'border-realm-lavender/10 text-realm-moon-muted'
                        }`}
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Public</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => canEdit && setFormData({ ...formData, privacy: 'private' })}
                        className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                          formData.privacy === 'private'
                            ? 'bg-realm-lavender/10 border-realm-lavender text-realm-lavender'
                            : 'border-realm-lavender/10 text-realm-moon-muted'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Private</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider block mb-1">
                      Max Members ({formData.maxMembers})
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      value={formData.maxMembers}
                      onChange={(e) => canEdit && setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                      disabled={!canEdit}
                      className="w-full h-2 bg-[#040610] rounded-lg appearance-none cursor-pointer accent-realm-lavender mt-3"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2.5 pt-2 border-t border-realm-lavender/10">
                  <span className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider block">
                    Permissions & Controls
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-[#040610]/60 border border-realm-lavender/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowChat}
                        onChange={(e) => canEdit && setFormData({ ...formData, allowChat: e.target.checked })}
                        disabled={!canEdit}
                        className="accent-realm-lavender rounded"
                      />
                      <span>Allow Chat</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-[#040610]/60 border border-realm-lavender/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowReactions}
                        onChange={(e) => canEdit && setFormData({ ...formData, allowReactions: e.target.checked })}
                        disabled={!canEdit}
                        className="accent-realm-lavender rounded"
                      />
                      <span>Allow Reactions</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-[#040610]/60 border border-realm-lavender/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowQueueEditing}
                        onChange={(e) => canEdit && setFormData({ ...formData, allowQueueEditing: e.target.checked })}
                        disabled={!canEdit}
                        className="accent-realm-lavender rounded"
                      />
                      <span>Allow Queue Editing</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-[#040610]/60 border border-realm-lavender/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowPlaybackControl}
                        onChange={(e) => canEdit && setFormData({ ...formData, allowPlaybackControl: e.target.checked })}
                        disabled={!canEdit}
                        className="accent-realm-lavender rounded"
                      />
                      <span>Playback Control for All</span>
                    </label>
                  </div>

                  <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-[#040610]/60 border border-realm-lavender/10 cursor-pointer text-xs mt-2">
                    <input
                      type="checkbox"
                      checked={formData.requireApproval}
                      onChange={(e) => canEdit && setFormData({ ...formData, requireApproval: e.target.checked })}
                      disabled={!canEdit}
                      className="accent-realm-lavender rounded"
                    />
                    <span>Require Approval To Join (Host approves requests)</span>
                  </label>
                </div>

                {canEdit && (
                  <div className="pt-4 border-t border-realm-lavender/10 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={saving}
                      icon={Check}
                      className="px-6 py-2.5 text-xs h-auto cursor-pointer font-bold"
                    >
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                )}
              </form>
            )}

            {/* TAB: Room Information */}
            {activeTab === 'info' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-[#040610]/60 border border-realm-lavender/10 space-y-3">
                  <div className="flex justify-between items-center border-b border-realm-lavender/10 pb-2">
                    <span className="text-realm-moon-muted">Room Name</span>
                    <span className="font-bold text-realm-moon">{currentRealm.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-realm-lavender/10 pb-2">
                    <span className="text-realm-moon-muted">Host</span>
                    <span className="font-bold text-realm-moon flex items-center space-x-1">
                      <Crown className="w-3.5 h-3.5 text-realm-gold" />
                      <span>{currentRealm.ownerName || 'Host'}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-realm-lavender/10 pb-2">
                    <span className="text-realm-moon-muted">Current Capacity</span>
                    <span className="font-bold text-realm-moon font-mono">
                      {currentMembersList.length} / {formData.maxMembers} members
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-realm-lavender/10 pb-2">
                    <span className="text-realm-moon-muted">Invite Code</span>
                    <span className="font-bold font-mono text-realm-lavender bg-realm-lavender/10 px-2 py-0.5 rounded border border-realm-lavender/15">
                      {currentRealm.code || currentRealm.inviteCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-realm-moon-muted">Created</span>
                    <span className="font-medium text-realm-moon">{createdTimeFormatted}</span>
                  </div>
                </div>

                {formData.description && (
                  <div className="p-4 rounded-2xl bg-[#040610]/60 border border-realm-lavender/10">
                    <span className="text-[10px] font-bold text-realm-lavender uppercase block mb-1">About This Room</span>
                    <p className="text-realm-moon-muted leading-relaxed">{formData.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Member Management */}
            {activeTab === 'members' && canEdit && (
              <div className="space-y-2">
                {currentMembersList.map((m, idx) => {
                  const targetId = m.userId || m.id;
                  const targetIsOwner = currentRealm.owner?.toString() === targetId?.toString();
                  return (
                    <div key={targetId || idx} className="flex items-center justify-between p-3 rounded-2xl bg-[#040610]/60 border border-realm-lavender/10 text-xs">
                      <div className="flex items-center space-x-2.5">
                        <img src={m.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.name}`} alt={m.name} className="w-7 h-7 rounded-lg object-cover bg-realm-navy-dark p-0.5 border border-realm-lavender/10" />
                        <span className="font-bold text-realm-moon">{m.name}</span>
                        {targetIsOwner && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-realm-gold/15 text-realm-gold font-bold border border-realm-gold/20 flex items-center space-x-1">
                            <Crown className="w-3 h-3" />
                            <span>Owner</span>
                          </span>
                        )}
                      </div>

                      {!targetIsOwner && isOwner && (
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => handleTransfer(m)}
                            className="px-2.5 py-1 rounded-xl bg-realm-gold/10 text-realm-gold hover:bg-realm-gold/20 border border-realm-gold/20 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Make Host
                          </button>
                          <button
                            onClick={() => handleKick(m)}
                            className="px-2.5 py-1 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: Join Requests */}
            {activeTab === 'requests' && canEdit && (
              <div className="space-y-2">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-realm-moon-muted text-xs">
                    No pending join requests.
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div key={req.userId} className="flex items-center justify-between p-3 rounded-2xl bg-[#040610]/60 border border-realm-lavender/10 text-xs">
                      <div className="flex items-center space-x-2.5">
                        <img src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.name}`} alt={req.name} className="w-7 h-7 rounded-lg object-cover bg-realm-navy-dark p-0.5 border border-realm-lavender/10" />
                        <span className="font-bold text-realm-moon">{req.name}</span>
                      </div>

                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => handleApprove(req.userId)}
                          className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(req.userId)}
                          className="px-3 py-1 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
