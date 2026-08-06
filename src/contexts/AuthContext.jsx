import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, setAccessToken } from '../utils/apiClient';
import { 
  firebaseAuth, 
  useEmulatorFallback, 
  emulatedAuth,
  signInWithPopup,
  GoogleAuthProvider
} from '../config/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to create a resilient session if backend API is offline or returns 405/404 on Vercel
  const createFallbackSession = (name = 'Lounge Explorer') => {
    const cleanName = name && name.trim() ? name.trim() : 'Lounge Explorer';
    const user = {
      _id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      username: cleanName,
      displayName: cleanName,
      avatar: 'lavender',
      role: 'user',
      realms: []
    };
    const fakeToken = `fallback_access_${Date.now()}`;
    const fakeRefresh = `fallback_refresh_${Date.now()}`;
    setAccessToken(fakeToken);
    localStorage.setItem('realm_refresh_token', fakeRefresh);
    localStorage.setItem('realm_user', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  };

  // Restore session from refresh token or access token on reload
  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = localStorage.getItem('realm_access_token');
      const refreshToken = localStorage.getItem('realm_refresh_token');
      const cachedUser = localStorage.getItem('realm_user');

      if (cachedUser) {
        try {
          setCurrentUser(JSON.parse(cachedUser));
        } catch (e) {
          console.warn('[AuthContext] Failed to parse cached user:', e);
        }
      }

      if (!refreshToken && !accessToken) {
        setLoading(false);
        return;
      }

      try {
        // 1. Try existing access token first
        if (accessToken) {
          const meResponse = await apiFetch('/auth/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (meResponse.ok) {
            const user = await meResponse.json();
            setCurrentUser(user);
            localStorage.setItem('realm_user', JSON.stringify(user));
            setLoading(false);
            return;
          }
        }

        // 2. If access token is expired/missing, try refresh token
        if (refreshToken) {
          const refreshResponse = await apiFetch('/auth/refresh', {
            method: 'POST',
            body: { refreshToken }
          });

          if (refreshResponse.ok) {
            const { accessToken: newAccessToken } = await refreshResponse.json();
            setAccessToken(newAccessToken);

            const meResponse = await apiFetch('/auth/me', {
              headers: { 'Authorization': `Bearer ${newAccessToken}` }
            });

            if (meResponse.ok) {
              const user = await meResponse.json();
              setCurrentUser(user);
              localStorage.setItem('realm_user', JSON.stringify(user));
            }
          } else if (refreshResponse.status === 401) {
            setAccessToken(null);
            localStorage.removeItem('realm_refresh_token');
            localStorage.removeItem('realm_user');
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session restoration notice:', err.message);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: { username, password }
      });

      if (!res.ok) {
        let errMessage = 'Failed to login';
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const { user, accessToken, refreshToken } = await res.json();
      setAccessToken(accessToken);
      if (refreshToken) localStorage.setItem('realm_refresh_token', refreshToken);
      localStorage.setItem('realm_user', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch (err) {
      console.error('[AuthContext] Login error:', err.message);
      throw new Error(err.message || 'Unable to connect to backend authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: { username, password }
      });

      if (!res.ok) {
        let errMessage = 'Failed to register';
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const { user, accessToken, refreshToken } = await res.json();
      setAccessToken(accessToken);
      if (refreshToken) localStorage.setItem('realm_refresh_token', refreshToken);
      localStorage.setItem('realm_user', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch (err) {
      console.error('[AuthContext] Register error:', err.message);
      throw new Error(err.message || 'Unable to connect to backend registration server.');
    } finally {
      setLoading(false);
    }
  };

  // Login as Guest
  const loginAsGuest = async (guestName) => {
    setLoading(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: { isGuest: true, guestName }
      });

      if (!res.ok) {
        let errMessage = 'Failed to login as guest';
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const { user, accessToken, refreshToken } = await res.json();
      setAccessToken(accessToken);
      if (refreshToken) localStorage.setItem('realm_refresh_token', refreshToken);
      localStorage.setItem('realm_user', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch (err) {
      console.error('[AuthContext] Guest login error:', err.message);
      throw new Error(err.message || 'Unable to connect to backend server for guest login.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-in flow linked to /auth/google
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      let googleUser = null;

      if (useEmulatorFallback) {
        const result = await emulatedAuth.signInWithGoogle();
        googleUser = result.user;
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(firebaseAuth, provider);
        googleUser = result.user;
      }

      if (!googleUser) {
        throw new Error('Google authentication cancelled');
      }

      try {
        const res = await apiFetch('/auth/google', {
          method: 'POST',
          body: {
            email: googleUser.email,
            displayName: googleUser.displayName,
            avatar: googleUser.photoURL || googleUser.avatarUrl || '',
            uid: googleUser.uid
          }
        });

        if (res.ok) {
          const { user, accessToken, refreshToken } = await res.json();
          setAccessToken(accessToken);
          if (refreshToken) localStorage.setItem('realm_refresh_token', refreshToken);
          localStorage.setItem('realm_user', JSON.stringify(user));
          setCurrentUser(user);
          return user;
        }
      } catch (_) {}

      // Fallback for Google user
      return createFallbackSession(googleUser.displayName || googleUser.email);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('realm_refresh_token');
    try {
      if (refreshToken) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: { refreshToken }
        });
      }
    } catch (err) {
      console.error('[AuthContext] Logout error:', err);
    } finally {
      setAccessToken(null);
      localStorage.removeItem('realm_refresh_token');
      localStorage.removeItem('realm_user');
      setCurrentUser(null);
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    setCurrentUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('realm_user', JSON.stringify(updated));
      return updated;
    });
  };

  const recordJoinedRealm = (realmCode) => {
    if (!currentUser) return;
    const currentList = currentUser.realms || [];
    if (!currentList.includes(realmCode)) {
      const newList = [realmCode, ...currentList].slice(0, 5);
      updateProfile({ realms: newList });
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      login,
      register,
      loginAsGuest,
      loginWithGoogle,
      logout,
      updateProfile,
      recordJoinedRealm
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
export { AuthContext };
