import React, { createContext, useContext, useState } from 'react';
import { 
  createRealmApi, 
  getRealmApi, 
  joinRealmApi, 
  updateRealmApi,
  leaveRealmApi,
  deleteRealmApi
} from '../services/api';

const RealmContext = createContext(null);

export function RealmProvider({ children }) {
  const [currentRealm, setCurrentRealm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createRealm = async ({ name, theme, privacy, maxMembers }) => {
    setLoading(true);
    setError(null);
    try {
      const realm = await createRealmApi({ name, theme, privacy, maxMembers });
      setCurrentRealm(realm);
      return realm;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadRealm = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const realm = await getRealmApi(code);
      setCurrentRealm(realm);
      return realm;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const joinRealm = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const realm = await joinRealmApi(code);
      setCurrentRealm(realm);
      return realm;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRealm = async (code, updates) => {
    const realmId = currentRealm?.realmId || code;
    
    // Perform optimistic local updates to ensure zero lag UI
    setCurrentRealm(prev => prev ? { ...prev, ...updates } : null);
    try {
      const updated = await updateRealmApi(realmId, updates);
      setCurrentRealm(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const leaveRealm = async (realmId) => {
    setLoading(true);
    setError(null);
    try {
      const targetId = realmId || currentRealm?.realmId;
      await leaveRealmApi(targetId);
      setCurrentRealm(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRealm = async (realmId) => {
    setLoading(true);
    setError(null);
    try {
      const targetId = realmId || currentRealm?.realmId;
      await deleteRealmApi(targetId);
      setCurrentRealm(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <RealmContext.Provider
      value={{
        currentRealm,
        loading,
        error,
        createRealm,
        loadRealm,
        joinRealm,
        updateRealm,
        leaveRealm,
        deleteRealm,
        clearError,
        setCurrentRealm
      }}
    >
      {children}
    </RealmContext.Provider>
  );
}

export function useRealm() {
  const context = useContext(RealmContext);
  if (!context) {
    throw new Error('useRealm must be used within a RealmProvider');
  }
  return context;
}
export { RealmContext };
