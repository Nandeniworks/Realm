import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { CallEngine } from '../webrtc/CallEngine.js';

export const CallContext = createContext(null);

export const CallProvider = ({ socket, roomCode, isHost, children }) => {
  const callEngine = useMemo(() => new CallEngine(), []);
  const [callState, setCallState] = useState(() => callEngine.getState());

  // Keep isHost flag updated on window so CallEngine can check it
  useEffect(() => {
    window.isRealmHost = isHost;
  }, [isHost]);

  // Bind socket and roomCode to CallEngine
  useEffect(() => {
    if (socket && roomCode) {
      callEngine.init(socket, roomCode);
    }
  }, [socket, roomCode, callEngine]);

  // Sync state changes from CallEngine to React
  useEffect(() => {
    const handleStateChange = (state) => {
      setCallState(state);
    };

    callEngine.addListener(handleStateChange);
    return () => {
      callEngine.removeListener(handleStateChange);
    };
  }, [callEngine]);

  // Automatically leave call on unmount
  useEffect(() => {
    return () => {
      callEngine.leaveCall();
    };
  }, [callEngine]);

  // Expose engine control API
  const api = useMemo(() => ({
    joinCall: () => callEngine.joinCall(),
    leaveCall: () => callEngine.leaveCall(),
    toggleMic: () => callEngine.setMicMuteState(!callEngine.muted),
    toggleCamera: () => callEngine.setCameraActiveState(!callEngine.cameraActive),
    startScreenShare: () => callEngine.startScreenShare(),
    stopScreenShare: () => callEngine.stopScreenShare(),
    changeAudioDevice: (id) => callEngine.changeAudioDevice(id),
    changeVideoDevice: (id) => callEngine.changeVideoDevice(id),
    changeSpeakerDevice: (id) => callEngine.changeSpeakerDevice(id),
    updateAudioConstraints: (constraints) => callEngine.updateAudioConstraints(constraints),
    updateVideoResolution: (res) => callEngine.updateVideoResolution(res),
    changeCallPermissions: (perms) => callEngine.changeCallPermissions(perms),
    forceStopUserScreenShare: (targetId) => callEngine.forceStopUserScreenShare(targetId),
    removeError: (id) => callEngine.removeError(id),
    enumerateDevices: () => callEngine.enumerateDevices()
  }), [callEngine]);

  const value = useMemo(() => ({
    ...callState,
    ...api,
    engine: callEngine
  }), [callState, api, callEngine]);

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
