import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import { useCall } from '../hooks/useCall.js';
import Button from '../../components/Button.jsx';
import GlassPanel from '../../components/GlassPanel.jsx';

// Live Microphone input level indicator component
function MicLevelTester({ stream }) {
  const [level, setLevel] = useState(0);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

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
        // Normalize level (average is between 0 and 255)
        setLevel(Math.min(100, Math.floor((average / 120) * 100)));
        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn('Mic level visualizer failed:', err);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream]);

  return (
    <div className="space-y-2 mt-1">
      <span className="text-[10px] font-bold text-realm-lavender uppercase tracking-wider block pl-1">
        Input Volume Test
      </span>
      <div className="w-full h-2.5 bg-realm-navy-dark rounded-full overflow-hidden border border-realm-lavender/5 relative flex">
        <motion.div 
          className="h-full bg-gradient-to-r from-realm-lavender to-emerald-400"
          style={{ width: `${level}%` }}
          transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
        />
      </div>
    </div>
  );
}

export default function MediaSettingsModal({ isOpen, onClose }) {
  const { 
    callStatus,
    devices, 
    activeDevices, 
    constraints, 
    videoResolution, 
    localStream,
    changeAudioDevice, 
    changeVideoDevice, 
    changeSpeakerDevice, 
    updateAudioConstraints, 
    updateVideoResolution,
    callPermissions,
    changeCallPermissions,
    enumerateDevices,
    engine
  } = useCall();

  const [activeTab, setActiveTab] = useState('devices'); // devices, audioFilters, permissions

  useEffect(() => {
    if (isOpen) {
      enumerateDevices();
    }
  }, [isOpen, enumerateDevices]);

  if (!isOpen) return null;

  const isHost = window.isRealmHost === true;

  const selectStyle = "w-full bg-[#07091B]/80 text-realm-moon text-xs rounded-xl p-3 border border-realm-lavender/10 focus:border-realm-lavender focus:outline-none transition-all cursor-pointer";
  const labelStyle = "text-[10px] font-bold text-realm-lavender uppercase tracking-wider block mb-1.5 pl-1";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
        {/* Overlay backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          className="w-full max-w-md relative z-10"
        >
          <GlassPanel className="p-6 border-realm-lavender/10 shadow-[0_20px_50px_rgba(4,6,16,0.8)] bg-realm-navy-dark">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-realm-lavender/5 pb-4 mb-4">
              <h3 className="text-sm font-bold text-realm-moon uppercase tracking-wider flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-realm-lavender" />
                <span>Device & Media Settings</span>
              </h3>
              
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-realm-moon-muted hover:text-realm-moon hover:bg-realm-navy-light/40 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-realm-lavender/5 mb-5 text-xs font-bold space-x-4">
              <button
                onClick={() => setActiveTab('devices')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'devices'
                    ? 'border-realm-lavender text-realm-lavender'
                    : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
                }`}
              >
                Media Devices
              </button>
              <button
                onClick={() => setActiveTab('audioFilters')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'audioFilters'
                    ? 'border-realm-lavender text-realm-lavender'
                    : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
                }`}
              >
                Audio & Video
              </button>
              {isHost && (
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`pb-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'permissions'
                      ? 'border-realm-lavender text-realm-lavender'
                      : 'border-transparent text-realm-moon-muted hover:text-realm-moon'
                  }`}
                >
                  Call Permissions
                </button>
              )}
            </div>

            {/* Tab: Devices */}
            {activeTab === 'devices' && (
              <div className="space-y-4">
                
                {/* Microphone Select */}
                <div>
                  <label className={labelStyle}>Microphone</label>
                  <select
                    value={activeDevices.microphone}
                    onChange={(e) => changeAudioDevice(e.target.value)}
                    className={selectStyle}
                  >
                    {devices.microphones.length === 0 ? (
                      <option value="">No Microphones Found</option>
                    ) : (
                      devices.microphones.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Webcam Select */}
                <div>
                  <label className={labelStyle}>Camera</label>
                  <select
                    value={activeDevices.camera}
                    onChange={(e) => changeVideoDevice(e.target.value)}
                    className={selectStyle}
                  >
                    {devices.cameras.length === 0 ? (
                      <option value="">No Webcams Found</option>
                    ) : (
                      devices.cameras.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Speaker Select */}
                <div>
                  <label className={labelStyle}>Speaker Output</label>
                  <select
                    value={activeDevices.speaker}
                    onChange={(e) => changeSpeakerDevice(e.target.value)}
                    className={selectStyle}
                  >
                    {devices.speakers.length === 0 ? (
                      <option value="">Default Speaker Output</option>
                    ) : (
                      devices.speakers.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Speaker ${d.deviceId.slice(0, 5)}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Media Testing: Audio Level & Webcam Preview */}
                <div className="space-y-3 pt-2">
                  {callStatus === 'connected' && localStream && (
                    <MicLevelTester stream={localStream} />
                  )}
                </div>
              </div>
            )}

            {/* Tab: Audio Filters & Quality */}
            {activeTab === 'audioFilters' && (
              <div className="space-y-4">
                
                {/* Audio constraints toggles */}
                <div className="space-y-3 bg-[#07091B]/40 rounded-2xl p-4 border border-realm-lavender/5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex flex-col text-left">
                      <span>Echo Cancellation</span>
                      <span className="text-[9px] text-realm-moon-muted">Filters room audio feedback loops</span>
                    </div>
                    <button
                      onClick={() => updateAudioConstraints({ echoCancellation: !constraints.echoCancellation })}
                      className="cursor-pointer text-realm-lavender"
                    >
                      {constraints.echoCancellation ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-realm-moon-muted" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold border-t border-realm-lavender/5 pt-3">
                    <div className="flex flex-col text-left">
                      <span>Noise Suppression</span>
                      <span className="text-[9px] text-realm-moon-muted">Suppresses static hums and fan noise</span>
                    </div>
                    <button
                      onClick={() => updateAudioConstraints({ noiseSuppression: !constraints.noiseSuppression })}
                      className="cursor-pointer text-realm-lavender"
                    >
                      {constraints.noiseSuppression ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-realm-moon-muted" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold border-t border-realm-lavender/5 pt-3">
                    <div className="flex flex-col text-left">
                      <span>Automatic Gain Control</span>
                      <span className="text-[9px] text-realm-moon-muted">Normalizes whisper and shouting volumes</span>
                    </div>
                    <button
                      onClick={() => updateAudioConstraints({ autoGainControl: !constraints.autoGainControl })}
                      className="cursor-pointer text-realm-lavender"
                    >
                      {constraints.autoGainControl ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-realm-moon-muted" />}
                    </button>
                  </div>
                </div>

                {/* Video Resolution Pick */}
                <div>
                  <label className={labelStyle}>Webcam Quality Profile</label>
                  <select
                    value={videoResolution}
                    onChange={(e) => updateVideoResolution(e.target.value)}
                    className={selectStyle}
                  >
                    <option value="360p">Low Quality (360p - 15fps)</option>
                    <option value="720p">Standard HD (720p - 24fps)</option>
                    <option value="1080p">High Definition (1080p - 30fps)</option>
                  </select>
                </div>

                {/* Mirror Preview Toggle */}
                <div className="flex items-center justify-between bg-[#07091B]/40 rounded-2xl p-4 border border-realm-lavender/5 text-xs font-semibold">
                  <div className="flex flex-col text-left">
                    <span>Mirror Local Camera Preview</span>
                    <span className="text-[9px] text-realm-moon-muted">Flips local webcam video horizontally</span>
                  </div>
                  <button
                    onClick={() => {
                      if (engine) {
                        engine.setMirrorLocalVideo(!engine.mirrorLocalVideo);
                      }
                    }}
                    className="cursor-pointer text-realm-lavender"
                  >
                    {engine && engine.mirrorLocalVideo ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-realm-moon-muted" />}
                  </button>
                </div>

              </div>
            )}

            {/* Tab: Permissions (Host Only) */}
            {activeTab === 'permissions' && isHost && (
              <div className="space-y-4">
                
                <div className="bg-[#07091B]/40 rounded-2xl p-4 border border-realm-lavender/5 space-y-3.5">
                  
                  {/* Lock voice channel */}
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex flex-col text-left">
                      <span>Voice Channel Enabled</span>
                      <span className="text-[9px] text-realm-moon-muted">Toggle mic permissions for guests</span>
                    </div>
                    <button
                      onClick={() => changeCallPermissions({ voiceEnabled: !callPermissions.voiceEnabled })}
                      className="cursor-pointer text-realm-lavender"
                    >
                      {callPermissions.voiceEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-realm-moon-muted" />}
                    </button>
                  </div>

                  {/* Lock webcams */}
                  <div className="flex items-center justify-between text-xs font-semibold border-t border-realm-lavender/5 pt-3.5">
                    <div className="flex flex-col text-left">
                      <span>Webcam Previews Enabled</span>
                      <span className="text-[9px] text-realm-moon-muted">Toggle video permissions for guests</span>
                    </div>
                    <button
                      onClick={() => changeCallPermissions({ cameraEnabled: !callPermissions.cameraEnabled })}
                      className="cursor-pointer text-realm-lavender"
                    >
                      {callPermissions.cameraEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-realm-moon-muted" />}
                    </button>
                  </div>

                  {/* Screen Share constraints */}
                  <div className="flex flex-col text-left border-t border-realm-lavender/5 pt-3.5 space-y-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">Who Can Share Screen</span>
                      <span className="text-[9px] text-realm-moon-muted">Filter screen share authorization roles</span>
                    </div>
                    <select
                      value={callPermissions.screenShareAllowed}
                      onChange={(e) => changeCallPermissions({ screenShareAllowed: e.target.value })}
                      className="bg-[#07091B]/80 text-realm-moon text-xs rounded-xl p-2.5 border border-realm-lavender/10 focus:border-realm-lavender focus:outline-none transition-all cursor-pointer w-full mt-1.5"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="host">Host Only</option>
                    </select>
                  </div>

                </div>

              </div>
            )}

            {/* OK Done Button */}
            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={onClose}
                className="px-5 py-2.5 text-xs h-auto cursor-pointer"
                icon={Check}
              >
                Apply & Close
              </Button>
            </div>

          </GlassPanel>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
