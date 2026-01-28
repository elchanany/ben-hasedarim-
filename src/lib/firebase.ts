import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
// import { getAnalytics } from "firebase/analytics"; // Removed static import to prevent AdBlocker crash

// הגדרות הקונפיגורציה - משתמשות במשתני הסביבה
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// אתחול האפליקציה (סינגלטון - מונע אתחול כפול)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ייצוא השירותים לשימוש בכל האתר
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1');

let analytics: any = null;

export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && !analytics) {
    try {
      // Use dynamic import so the app doesn't crash if adblocker blocks this file
      const { getAnalytics } = await import("firebase/analytics");
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    } catch (e) {
      console.error("Firebase Analytics initialization failed (likely blocked by adblocker)", e);
    }
  }
  return analytics;
};

export { app };



