import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Lock, Unlock } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import GlassPanel from '../components/GlassPanel';
import { useRealm } from '../contexts/RealmContext';
import { useAuth } from '../contexts/AuthContext';

export default function CreateRealmPage() {
  const navigate = useNavigate();
  const { createRealm, loading, error: apiError } = useRealm();
  const { currentUser, login, register } = useAuth();
  
  const [realmName, setRealmName] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [maxMembers, setMaxMembers] = useState(8);
  
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [localError, setLocalError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!realmName.trim()) return;
    setLocalError(null);

    try {
      const realm = await createRealm({
        name: realmName.trim(),
        privacy,
        maxMembers
      });
      navigate(`/realm/${realm.code}`);
    } catch (err) {
      setLocalError(err.message || 'Failed to create your room. Please try again.');
    }
  };

  const activeError = localError || apiError;

  // Render Login / Register forms if user is not authenticated
  if (!currentUser) {
    const handleAuthSubmit = async (e) => {
      e.preventDefault();
      if (!username.trim() || !password.trim()) return;
      setLoginLoading(true);
      setAuthError(null);

      try {
        if (isRegister) {
          await register(username, password);
        } else {
          await login(username, password);
        }
      } catch (err) {
        setAuthError(err.message || 'Authentication failed. Please verify credentials.');
      } finally {
        setLoginLoading(false);
      }
    };

    return (
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center pt-32 pb-16 px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="w-full max-w-md"
        >
          <GlassPanel className="border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.8)] p-6 md:p-8 text-center bg-[#080a15]/85">
            <h1 className="text-2xl font-bold text-realm-moon mb-2 font-sans">
              {isRegister ? 'Create Account' : 'Identity Required'}
            </h1>
            <p className="text-xs text-realm-moon-muted mb-6">
              {isRegister ? 'Sign up to create your own lounge' : 'Log in to manage your lounge'}
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-realm-pink/15 border border-realm-pink/20 text-realm-pink text-xs text-left">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-realm-moon placeholder-realm-moon-muted/30 focus:ring-1 focus:ring-realm-lavender/25 font-sans"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-realm-moon placeholder-realm-moon-muted/30 focus:ring-1 focus:ring-realm-lavender/25 font-sans"
                required
              />
              <Button type="submit" variant="primary" className="w-full font-bold cursor-pointer" disabled={loginLoading}>
                {loginLoading ? 'Authenticating...' : isRegister ? 'Register & Continue' : 'Login & Continue'}
              </Button>
            </form>

            <div className="text-xs text-realm-moon-muted">
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
              <button 
                type="button" 
                onClick={() => { setIsRegister(!isRegister); setAuthError(null); }}
                className="text-realm-lavender hover:underline font-semibold focus:outline-none cursor-pointer"
              >
                {isRegister ? 'Login' : 'Register'}
              </button>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full min-h-screen flex items-center justify-center pt-32 pb-16 px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="w-full max-w-2xl"
      >
        <GlassPanel className="border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.8)]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-realm-moon mb-2">Create Your Lounge</h1>
            <p className="text-sm text-realm-moon-muted">
              Configure your digital room and invite friends for a shared cinematic journey.
            </p>
          </div>

          {activeError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-realm-pink/10 border border-realm-pink/20 text-realm-pink text-sm text-left"
            >
              {activeError}
            </motion.div>
          )}

          <form onSubmit={handleCreate} className="space-y-8">
            {/* Realm Name input */}
            <Input
              label="Lounge Name"
              id="realm-name"
              placeholder="e.g. Cinema Club"
              value={realmName}
              onChange={(e) => setRealmName(e.target.value)}
              required
            />

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <label className="text-xs font-semibold text-realm-lavender/80 uppercase tracking-wider block mb-3">
                  Privacy Settings
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrivacy('public')}
                    className={`flex items-center justify-center space-x-2 py-3 rounded-2xl border transition-all text-xs font-bold ${
                      privacy === 'public'
                        ? 'bg-realm-lavender/10 border-realm-lavender text-realm-lavender'
                        : 'border-realm-lavender/10 text-realm-moon-muted hover:text-realm-moon hover:border-realm-lavender/25'
                    }`}
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Public Lounge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrivacy('private')}
                    className={`flex items-center justify-center space-x-2 py-3 rounded-2xl border transition-all text-xs font-bold ${
                      privacy === 'private'
                        ? 'bg-realm-lavender/10 border-realm-lavender text-realm-lavender'
                        : 'border-realm-lavender/10 text-realm-moon-muted hover:text-realm-moon hover:border-realm-lavender/25'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Private invite only</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-realm-lavender/80 uppercase tracking-wider block mb-3">
                  Max Members Count ({maxMembers})
                </label>
                <input
                  type="range"
                  min="2"
                  max="16"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(parseInt(e.target.value))}
                  className="w-full h-2 bg-realm-navy-light rounded-lg appearance-none cursor-pointer accent-realm-lavender focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-realm-moon-muted mt-2 font-mono">
                  <span>2 members</span>
                  <span>8 members</span>
                  <span>16 members</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-realm-lavender/5">
              <Button
                type="button"
                variant="glass"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={Sparkles}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Open Lounge'}
              </Button>
            </div>
          </form>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
