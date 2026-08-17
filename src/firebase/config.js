/**
 * VERSUS - Firebase Configuration & Initialization
 */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Firebase configuration.
// If custom environment variables or local credentials are provided, they are loaded.
export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForVersusMultiplayer00",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "versus-battle-arena.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "versus-battle-arena",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "versus-battle-arena.appspot.com",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:100000000000:web:abcdef123456"
};

let app = null;
let db = null;
let rtdb = null;
let isFirebaseAvailable = false;

try {
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('Dummy')) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseAvailable = true;
  }
} catch (e) {
  console.warn('Firebase initialized in local/offline fallback mode:', e.message);
}

export { app, db, rtdb, isFirebaseAvailable };
