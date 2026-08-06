import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mic, MicOff, Video, VideoOff, ShieldAlert, Sparkles, SlidersHorizontal, AlertCircle, CheckCircle, Wifi, User } from 'lucide-react';
import { useCall } from '../hooks/useCall.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Button from '../../components/Button.jsx';

function PrejoinMicTester({ stream }) {
  const [level, setLevel] = useState(0);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      setLevel(0);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setLevel(Math.min(100, Math.floor((average / 120) * 100)));
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.warn('Prejoin mic visualizer error:', err);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, [stream]);

  return (
    <div className="space-y-1.5 text-left">
      <span className="text-[9px] font-bold text-realm-lavender uppercase tracking-wider block">
        Microphone Volume Meter
      </span>
      <div className="w-full h-2 bg-realm-navy-dark rounded-full overflow-hidden border border-realm-lavender/10 relative">
        <motion.div 
          className="h-full bg-gradient-to-r from-realm-lavender to-emerald-400"
          style={{ width: `${level}%` }}
          transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
        />
      </div>
    </div>
  );
}

export default function JoinVoiceOverlay() {
  const { currentUser } = useAuth();
  const { 
    callStatus, 
    joinCall, 
    callPermissions, 
    devices, 
    activeDevices, 
    changeAudioDevice, 
    changeVideoDevice,
    changeSpeakerDevice,
    enumerateDevices
  } = useCall();

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const [initComplete, setInitComplete] = useState(false);

  const videoRef = useRef(null);
  const displayName = currentUser?.displayName || currentUser?.username || 'Guest Traveler';

  useEffect(() => {
    let isMounted = true;
    enumerateDevices().then(() => {
      if (isMounted) setInitComplete(true);
    }).catch(() => {
      if (isMounted) setInitComplete(true);
    });
    return () => { isMounted = false; };
  }, [enumerateDevices]);

  useEffect(() => {
    if (callStatus === 'connected') {
      stopPreview();
    }
  }, [callStatus]);

  useEffect(() => {
    let isMounted = true;
    const startPreviewStream = async () => {
      setPermissionError(null);
      setCameraInitializing(true);
      console.log("Permissions requested");
      try {
        const constraints = {
          audio: micEnabled ? (activeDevices.microphone ? { deviceId: { exact: activeDevices.microphone } } : true) : false,
          video: cameraEnabled ? (activeDevices.camera ? { deviceId: { exact: activeDevices.camera } } : true) : false
        };

        if (!constraints.audio && !constraints.video) {
          stopPreviewStreamOnly();
          if (isMounted) setCameraInitializing(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Permissions granted");
        if (isMounted) {
          setPreviewStream(stream);
          setCameraInitializing(false);
          if (videoRef.current && cameraEnabled) {
            videoRef.current.srcObject = stream;
          }
        } else {
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        console.log("Permissions denied");
        console.warn('Pre-join preview stream error:', err);
        if (isMounted) {
          setCameraInitializing(false);
          setPermissionError('Camera/Mic permission denied or unavailable (Joining as viewer).');
        }
      }
    };

    startPreviewStream();

    return () => {
      isMounted = false;
    };
  }, [micEnabled, cameraEnabled, activeDevices.microphone, activeDevices.camera]);

  useEffect(() => {
    if (videoRef.current && previewStream && cameraEnabled) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream, cameraEnabled]);

  const stopPreviewStreamOnly = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(t => t.stop());
      setPreviewStream(null);
    }
  };

  const stopPreview = () => {
    stopPreviewStreamOnly();
  };

  const handleJoin = async () => {
    console.log("Join button clicked");
    stopPreview();
    try {
      await joinCall();
    } catch (err) {
      console.error('Failed to join room voice:', err);
    }
  };

  if (callStatus === 'connected') return null;

  // The Join button must ALWAYS be enabled regardless of permissions or loading state (Checklist Item 1 & 3)
  const isJoinDisabled = false;

  return (
    <div className="p-4 rounded-2xl border border-realm-lavender/10 bg-realm-navy-dark/75 backdrop-blur-xl relative overflow-hidden shadow-lg mt-2 text-left space-y-3.5">
      <div className="absolute top-0 right-0 w-24 h-24 bg-realm-lavender/5 rounded-full blur-2xl pointer-events-none" />

      {callStatus === 'disconnected' ? (
        <div className="space-y-3.5 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-realm-lavender/10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-realm-lavender/10 border border-realm-lavender/25 text-realm-lavender flex items-center justify-center shadow-[0_0_12px_rgba(195,201,255,0.15)]">
                <Phone className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-realm-moon tracking-wide">Pre-Join Device Setup</h4>
                <p className="text-[9px] text-realm-moon-muted">Configure camera & microphone before joining</p>
              </div>
            </div>

            {/* Display Name Badge */}
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-realm-lavender/10 border border-realm-lavender/15 text-[10px] font-bold text-realm-moon">
              <User className="w-3 h-3 text-realm-lavender" />
              <span className="truncate max-w-[90px]">{displayName}</span>
            </div>
          </div>

          {!callPermissions.voiceEnabled && (
            <div className="flex items-center justify-center space-x-1.5 p-1.5 rounded-lg bg-realm-pink/10 border border-realm-pink/20 text-realm-pink text-[9px] font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Voice channel disabled by Host</span>
            </div>
          )}

          {/* Camera Preview Container */}
          <div className="relative w-full h-36 rounded-xl bg-[#040610] border border-realm-lavender/10 overflow-hidden flex items-center justify-center">
            {cameraInitializing ? (
              <div className="text-center p-3 space-y-1">
                <Sparkles className="w-5 h-5 text-realm-lavender animate-spin mx-auto" />
                <span className="text-[10px] text-realm-moon-muted">Initializing Camera...</span>
              </div>
            ) : cameraEnabled && previewStream && !permissionError ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="text-center p-3">
                <VideoOff className="w-6 h-6 text-realm-moon-muted/40 mx-auto mb-1" />
                <span className="text-[10px] text-realm-pink font-medium block">
                  {permissionError || 'No camera permission.'}
                </span>
                <span className="text-[9px] text-realm-moon-muted">You can join without camera.</span>
              </div>
            )}

            {/* Prejoin Media Mute & Camera Toggles Overlay */}
            <div className="absolute bottom-2 right-2 flex space-x-1.5">
              <button
                type="button"
                onClick={() => setMicEnabled(!micEnabled)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  micEnabled 
                    ? 'bg-realm-navy-dark/80 border-realm-lavender/25 text-emerald-400' 
                    : 'bg-red-500/20 border-red-500/30 text-red-400'
                }`}
                title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setCameraEnabled(!cameraEnabled)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  cameraEnabled 
                    ? 'bg-realm-navy-dark/80 border-realm-lavender/25 text-sky-400' 
                    : 'bg-realm-navy-dark/80 border-realm-lavender/10 text-realm-moon-muted'
                }`}
                title={cameraEnabled ? "Disable Camera" : "Enable Camera"}
              >
                {cameraEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Microphone Volume Meter */}
          {micEnabled && previewStream && (
            <PrejoinMicTester stream={previewStream} />
          )}

          {/* Device Selection Controls */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-realm-moon-muted uppercase block mb-1">Microphone</label>
                <select
                  value={activeDevices.microphone}
                  onChange={(e) => changeAudioDevice(e.target.value)}
                  className="w-full bg-[#040610] text-realm-moon text-[10px] rounded-lg p-2 border border-realm-lavender/10 focus:outline-none cursor-pointer truncate"
                >
                  {devices.microphones.length === 0 ? (
                    <option value="">Default Microphone</option>
                  ) : (
                    devices.microphones.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone (${d.deviceId.slice(0, 4)})`}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-realm-moon-muted uppercase block mb-1">Camera</label>
                <select
                  value={activeDevices.camera}
                  onChange={(e) => changeVideoDevice(e.target.value)}
                  className="w-full bg-[#040610] text-realm-moon text-[10px] rounded-lg p-2 border border-realm-lavender/10 focus:outline-none cursor-pointer truncate"
                >
                  {devices.cameras.length === 0 ? (
                    <option value="">Default Camera</option>
                  ) : (
                    devices.cameras.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera (${d.deviceId.slice(0, 4)})`}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Speaker Output Selection (if supported) */}
            {devices.speakers.length > 0 && (
              <div>
                <label className="text-[9px] font-bold text-realm-moon-muted uppercase block mb-1">Speaker Output</label>
                <select
                  value={activeDevices.speaker}
                  onChange={(e) => changeSpeakerDevice(e.target.value)}
                  className="w-full bg-[#040610] text-realm-moon text-[10px] rounded-lg p-2 border border-realm-lavender/10 focus:outline-none cursor-pointer truncate"
                >
                  {devices.speakers.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker (${d.deviceId.slice(0, 4)})`}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Explicit Join Button */}
          <Button
            variant="primary"
            onClick={handleJoin}
            disabled={isJoinDisabled}
            className="w-full text-xs py-2.5 h-auto cursor-pointer shadow-md font-bold"
            icon={Mic}
          >
            {isJoinDisabled ? 'Initializing Devices...' : 'Join Room Voice'}
          </Button>
        </div>
      ) : (
        <div className="text-center py-4 space-y-4 relative z-10">
          <div className="w-12 h-12 mx-auto relative flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-realm-lavender/40"
            />
            <motion.div 
              animate={{ scale: [0.8, 1.15, 0.8], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-8 h-8 rounded-full bg-realm-lavender/20 border border-realm-lavender/40 flex items-center justify-center"
            >
              <Sparkles className="w-4 h-4 text-realm-lavender" />
            </motion.div>
          </div>
          
          <div>
            <h4 className="text-xs font-bold text-realm-moon tracking-wide animate-pulse font-sans">Connecting to Voice...</h4>
            <p className="text-[9px] text-realm-moon-muted mt-1 font-sans">
              Establishing WebRTC peer session
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
