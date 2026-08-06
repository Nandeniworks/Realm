import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles, ArrowRight, Clock, ShieldAlert, Video, VideoOff, Mic, MicOff, Camera, User } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import GlassPanel from '../components/GlassPanel';
import { useRealm } from '../contexts/RealmContext';
import { useAuth } from '../contexts/AuthContext';

export default function JoinRealmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code') || '';

  const { joinRealm, loading, error: apiError, clearError } = useRealm();
  const { currentUser, login, register, loginAsGuest, recordJoinedRealm } = useAuth();

  const [realmCode, setRealmCode] = useState(urlCode.toUpperCase());
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [localError, setLocalError] = useState(null);

  // PreJoin Camera & Microphone Device Setup State
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const videoRef = useRef(null);

  // Log "PreJoin mounted" on mount (Checklist Item 5)
  useEffect(() => {
    console.log("PreJoin mounted");
  }, []);

  // Optional Camera & Microphone Device Setup Preview
  useEffect(() => {
    let isMounted = true;

    const startPreviewStream = async () => {
      console.log("Permissions requested");
      try {
        if (!micEnabled && !cameraEnabled) {
          if (previewStream) {
            previewStream.getTracks().forEach(t => t.stop());
            setPreviewStream(null);
          }
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: micEnabled,
          video: cameraEnabled
        });

        console.log("Permissions granted");
        if (isMounted) {
          setPreviewStream(stream);
          setPermissionState('granted');
          if (videoRef.current && cameraEnabled) {
            videoRef.current.srcObject = stream;
          }
        } else {
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        console.log("Permissions denied");
        if (isMounted) {
          setPermissionState('denied');
          // Media devices fail -> continue with camera: false, microphone: false as viewer (Checklist Item 4)
        }
      }
    };

    startPreviewStream();

    return () => {
      isMounted = false;
    };
  }, [micEnabled, cameraEnabled]);

  useEffect(() => {
    if (videoRef.current && previewStream && cameraEnabled) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream, cameraEnabled]);

  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    console.log("[Logging] Join Button Clicked");
    console.log("[Logging] Joining Room");

    const codeToJoin = (realmCode.trim() || urlCode.trim() || 'LOUNGE1').toUpperCase();

    try {
      setLocalError(null);
      clearError();

      let activeUser = currentUser;
      if (!activeUser) {
        const guestName = username.trim() || `Traveler_${Math.floor(1000 + Math.random() * 9000)}`;
        activeUser = await loginAsGuest(guestName);
      }

      // Execute realm join
      await joinRealm(codeToJoin);
      if (recordJoinedRealm) recordJoinedRealm(codeToJoin);

      // Check socket status & emit join-room
      if (window.realmSocket) {
        console.log("[Logging] Socket Connected");
        window.realmSocket.emit('join-room', codeToJoin, {
          id: activeUser?._id || activeUser?.id,
          username: activeUser?.displayName || activeUser?.username || 'Guest Traveler'
        });
        console.log("join-room emitted");
      }

      console.log(`Navigation to /realm/${codeToJoin}`);
      navigate(`/realm/${codeToJoin}`);
    } catch (err) {
      console.warn("PreJoin join fallback notice:", err);
      // Removed the navigate call to disable the offline fallback. 
      // If the backend cannot be reached, we must display an error.
      setLocalError("Unable to connect to Realm.");
    }
  };

  const handleRecentJoin = async (code) => {
    setRealmCode(code);
    console.log("[Logging] Join Button Clicked");
    console.log("[Logging] Joining Room");
    try {
      await joinRealm(code);
      if (recordJoinedRealm) recordJoinedRealm(code);

      if (window.realmSocket) {
        console.log("[Logging] Socket Connected");
        window.realmSocket.emit('join-room', code, {
          id: currentUser?._id || currentUser?.id,
          username: currentUser?.displayName || currentUser?.username || 'Guest Traveler'
        });
        console.log("join-room emitted");
      }

      console.log(`Navigation to /realm/${code}`);
      navigate(`/realm/${code}`);
    } catch (err) {
      console.error("Recent Join Error:", err);
      setLocalError("Unable to connect to Realm.");
    }
  };

  const activeError = localError || apiError;

  // Unauthenticated user flow: allow logging in, registering, or joining instantly as a Guest
  if (!currentUser) {
    const handleAuthSubmit = async (e) => {
      e.preventDefault();
      if (!username.trim()) return;
      setLoginLoading(true);
      setAuthError(null);

      try {
        if (password.trim()) {
          if (isRegister) {
            await register(username, password);
          } else {
            await login(username, password);
          }
        } else {
          await loginAsGuest(username);
        }
      } catch (err) {
        setAuthError(err.message || 'Authentication failed. Continuing as guest...');
        await loginAsGuest(username);
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
              Welcome to Realm
            </h1>
            <p className="text-xs text-realm-moon-muted mb-6">
              Enter your display name to join room <span className="font-mono text-realm-lavender font-bold">#{urlCode || 'LOUNGE'}</span>
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-realm-pink/15 border border-realm-pink/20 text-realm-pink text-xs text-left">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Display Name / Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-realm-moon placeholder-realm-moon-muted/30 focus:ring-1 focus:ring-realm-lavender/25 font-sans"
                required
              />
              <input
                type="password"
                placeholder="Password (Optional for Guests)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-realm-moon placeholder-realm-moon-muted/30 focus:ring-1 focus:ring-realm-lavender/25 font-sans"
              />
              {/* Join button MUST ALWAYS BE VISIBLE AND ENABLED (Checklist Item 1 & 3) */}
              <Button type="submit" variant="primary" className="w-full font-bold cursor-pointer">
                {loginLoading ? 'Entering Lounge...' : 'Continue to Pre-Join'}
              </Button>
            </form>

            <div className="text-xs text-realm-moon-muted">
              {isRegister ? 'Already have an account? ' : "Want to register an account? "}
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

  const activeRecentRealms = currentUser.recentRealms || currentUser.realms || [];

  return (
    <div className="relative z-10 w-full min-h-screen flex items-center justify-center pt-32 pb-16 px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="w-full max-w-xl"
      >
        <GlassPanel className="border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.8)] relative overflow-hidden">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-semibold text-realm-moon mb-2 font-sans">Pre-Join Realm Setup</h1>
            <p className="text-sm text-realm-moon-muted">
              Configure optional camera and microphone before joining room <span className="font-mono text-realm-lavender font-bold">#{realmCode || urlCode || 'LOUNGE'}</span>
            </p>
          </div>

          {activeError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-realm-pink/15 border border-realm-pink/20 text-realm-pink text-xs text-left flex items-start space-x-2"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-realm-pink mt-0.5" />
              <span>{activeError}</span>
            </motion.div>
          )}

          {/* Form & Pre-Join Media Controls */}
          <form onSubmit={handleJoin} className="space-y-6">
            <Input
              label="Room Invite Code"
              id="realm-code"
              placeholder="e.g. MOON9"
              value={realmCode}
              onChange={(e) => setRealmCode(e.target.value)}
              required
            />

            {/* Camera & Microphone Device Setup Block */}
            <div className="p-4 rounded-2xl border border-realm-lavender/10 bg-[#040610]/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-realm-moon flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-realm-lavender" />
                  <span>Media Devices (Optional)</span>
                </span>
                <span className="text-[10px] text-realm-moon-muted">
                  {permissionState === 'denied' ? 'Viewer Mode (No Cam/Mic)' : 'Cam & Mic Preview'}
                </span>
              </div>

              {/* Camera Preview Video Container */}
              <div className="relative w-full h-40 rounded-xl bg-black/60 border border-realm-lavender/10 overflow-hidden flex items-center justify-center">
                {cameraEnabled && previewStream && permissionState !== 'denied' ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                ) : (
                  <div className="text-center p-4">
                    <VideoOff className="w-8 h-8 text-realm-moon-muted/40 mx-auto mb-2" />
                    <span className="text-xs text-realm-moon-muted block font-medium">
                      {permissionState === 'denied' ? 'Camera/Mic permission denied.' : 'Camera disabled.'}
                    </span>
                    <span className="text-[10px] text-realm-lavender/70 block mt-1">
                      Joining in Viewer Mode (No mic or camera required)
                    </span>
                  </div>
                )}

                {/* Cam/Mic Toggle Buttons Overlay */}
                <div className="absolute bottom-3 right-3 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      micEnabled 
                        ? 'bg-realm-navy-dark/90 border-realm-lavender/30 text-emerald-400' 
                        : 'bg-red-500/20 border-red-500/30 text-red-400'
                    }`}
                    title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      cameraEnabled 
                        ? 'bg-realm-navy-dark/90 border-realm-lavender/30 text-sky-400' 
                        : 'bg-realm-navy-dark/90 border-realm-lavender/10 text-realm-moon-muted'
                    }`}
                    title={cameraEnabled ? "Disable Camera" : "Enable Camera"}
                  >
                    {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons: Join button MUST ALWAYS BE VISIBLE & ENABLED (Checklist Items 1, 2, 3, 4) */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-realm-lavender/5">
              <Link to="/">
                <Button variant="glass" type="button">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                icon={ArrowRight}
                className="font-bold text-sm py-3 px-6 cursor-pointer shadow-lg"
              >
                Join Realm
              </Button>
            </div>
          </form>

          {/* Recently Visited Rooms */}
          {activeRecentRealms.length > 0 && (
            <div className="mt-8 pt-6 border-t border-realm-lavender/5 text-left">
              <h3 className="text-xs font-semibold text-realm-lavender/80 uppercase tracking-wider mb-4 flex items-center space-x-1.5 pl-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Recently Visited Rooms</span>
              </h3>
              <div className="space-y-2.5">
                {activeRecentRealms.map((code) => (
                  <div
                    key={code}
                    onClick={() => handleRecentJoin(code)}
                    className="flex items-center justify-between p-3 rounded-2xl border border-realm-lavender/5 bg-realm-navy-light/10 hover:border-realm-lavender/15 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-xl bg-realm-navy-dark border border-realm-lavender/10 flex items-center justify-center text-realm-lavender">
                        <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-realm-moon leading-tight">
                          Realm {code}
                        </span>
                        <span className="text-[10px] text-realm-moon-muted mt-1 font-mono">
                          Code invite: {code}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-realm-moon-muted group-hover:text-realm-lavender group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassPanel>
      </motion.div>
    </div>
  );
}
