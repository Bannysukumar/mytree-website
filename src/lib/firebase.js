import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB-hdVSuNdsYyVmR2eSrbQ1Tl6LGLevvx4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "uwgea32.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "uwgea32",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "uwgea32.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "127251704035",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:127251704035:web:002d1c99b1dca5e909fdd6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-N4S1GPPZSN",
};

const app = initializeApp(firebaseConfig);

export const firebaseReady = true;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, import.meta.env.VITE_FUNCTIONS_REGION || "us-central1");
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export let analytics = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((ok) => {
      if (ok) analytics = getAnalytics(app);
    })
    .catch(() => {});
}
