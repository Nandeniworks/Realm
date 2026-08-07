import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously, 
  signOut,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs
} from 'firebase/firestore';

// Standard Firebase configurations (reading from Vite environment variables)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDB = null;
let useEmulatorFallback = true;

// Only initialize if keys are present
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }
    firebaseAuth = getAuth(firebaseApp);
    firestoreDB = getFirestore(firebaseApp);
    useEmulatorFallback = false;
    console.log("[Firebase] SDK & Firestore initialized successfully with active config keys.");
  } catch (err) {
    console.error("[Firebase] Initialization failed, falling back to local emulator:", err);
  }
} else {
  console.log("[Firebase] Configuration keys missing. Activating local emulator fallback.");
}

// -------------------------------------------------------------
// EMULATED FIRESTORE LAYER (Local Storage fallback for collections)
// -------------------------------------------------------------
const emulatedFirestoreStore = new Map();

const emulatedFirestore = {
  getDoc: async (collectionName, id) => {
    const key = `${collectionName}/${id}`;
    if (emulatedFirestoreStore.has(key)) {
      return { exists: () => true, data: () => emulatedFirestoreStore.get(key) };
    }
    const cached = localStorage.getItem(`firestore_${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      emulatedFirestoreStore.set(key, parsed);
      return { exists: () => true, data: () => parsed };
    }
    return { exists: () => false, data: () => null };
  },
  setDoc: async (collectionName, id, data) => {
    const key = `${collectionName}/${id}`;
    const merged = { ...data, updatedAt: new Date().toISOString() };
    emulatedFirestoreStore.set(key, merged);
    localStorage.setItem(`firestore_${key}`, JSON.stringify(merged));
    return true;
  },
  getCollection: async (collectionName) => {
    const results = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`firestore_${collectionName}/`)) {
        try {
          results.push(JSON.parse(localStorage.getItem(k)));
        } catch (_) {}
      }
    }
    return results;
  }
};

// Unified Firestore helper for reads & writes
export const readFirestoreDoc = async (col, docId) => {
  if (firestoreDB && !useEmulatorFallback) {
    try {
      const docRef = doc(firestoreDB, col, docId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) return snapshot.data();
    } catch (e) {
      console.warn(`[Firestore] Read error for ${col}/${docId}:`, e.message);
    }
  }
  const emulated = await emulatedFirestore.getDoc(col, docId);
  return emulated.exists() ? emulated.data() : null;
};

export const writeFirestoreDoc = async (col, docId, data) => {
  if (firestoreDB && !useEmulatorFallback) {
    try {
      const docRef = doc(firestoreDB, col, docId);
      await setDoc(docRef, data, { merge: true });
      return true;
    } catch (e) {
      console.warn(`[Firestore] Write error for ${col}/${docId}:`, e.message);
    }
  }
  return emulatedFirestore.setDoc(col, docId, data);
};

// -------------------------------------------------------------
// EMULATED AUTH LAYER (Local Storage fallback for local demos)
// -------------------------------------------------------------
const getLocalUser = () => {
  const cached = localStorage.getItem('emulated_firebase_user');
  return cached ? JSON.parse(cached) : null;
};

const setLocalUser = (user) => {
  if (user) {
    localStorage.setItem('emulated_firebase_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('emulated_firebase_user');
  }
};

const emulatedAuth = {
  currentUser: getLocalUser(),
  onAuthStateChanged: (callback) => {
    const currentUser = getLocalUser();
    callback(currentUser);
    const listener = (e) => {
      if (e.key === 'emulated_firebase_user') {
        callback(getLocalUser());
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  },
  signInAnonymously: async () => {
    const user = {
      uid: 'anon-' + Math.random().toString(36).substr(2, 9),
      displayName: 'Anonymous Traveler',
      isAnonymous: true,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=anon',
      joinDate: new Date().toLocaleDateString(),
      recentRealms: [],
      favoriteThemes: ['moonlight-library']
    };
    setLocalUser(user);
    window.dispatchEvent(new StorageEvent('storage', { key: 'emulated_firebase_user' }));
    return { user };
  },
  signInWithGoogle: async () => {
    const randomSeed = Math.random().toString(36).substr(2, 5);
    const user = {
      uid: 'google-' + Math.random().toString(36).substr(2, 9),
      displayName: `Starlight Explorer ${randomSeed.toUpperCase()}`,
      email: `user_${randomSeed}@gmail.com`,
      isAnonymous: false,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${randomSeed}`,
      joinDate: new Date().toLocaleDateString(),
      recentRealms: [],
      favoriteThemes: ['moonlight-library', 'celestial-dreams']
    };
    setLocalUser(user);
    window.dispatchEvent(new StorageEvent('storage', { key: 'emulated_firebase_user' }));
    return { user };
  },
  signInAsGuest: async (name) => {
    const cleanName = name.trim() || 'Guest Member';
    const user = {
      uid: 'guest-' + Math.random().toString(36).substr(2, 9),
      displayName: cleanName,
      isAnonymous: true,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanName}`,
      joinDate: new Date().toLocaleDateString(),
      recentRealms: [],
      favoriteThemes: ['moonlight-library']
    };
    setLocalUser(user);
    window.dispatchEvent(new StorageEvent('storage', { key: 'emulated_firebase_user' }));
    return { user };
  },
  signOut: async () => {
    setLocalUser(null);
    window.dispatchEvent(new StorageEvent('storage', { key: 'emulated_firebase_user' }));
  },
  updateProfile: async (updates) => {
    const currentUser = getLocalUser();
    if (currentUser) {
      const merged = { ...currentUser, ...updates };
      setLocalUser(merged);
      window.dispatchEvent(new StorageEvent('storage', { key: 'emulated_firebase_user' }));
      return merged;
    }
    throw new Error("No user logged in to update profile.");
  }
};

export {
  firebaseApp,
  firebaseAuth,
  firestoreDB,
  useEmulatorFallback,
  emulatedAuth,
  emulatedFirestore,
  // SDK Direct Exports
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  fbUpdateProfile
};
