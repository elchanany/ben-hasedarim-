// src/firebaseConfig.ts
import "firebase/auth";
import "firebase/firestore";
import "firebase/functions";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// import { getAnalytics } from "firebase/analytics"; // Analytics is optional/commented out to avoid build errors if not needed

// ================================================================================================
// טעינת הגדרות Firebase ממשתני סביבה (Environment Variables)
// הערכים נטענים מקובץ .env.local בסביבת פיתוח, או מהגדרות Vercel בפרודקשן
// ================================================================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
if (!getApps().length) {
  // בדיקה שיש לנו את המפתח המינימלי לפני האתחול
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
  } else {
    console.warn("Firebase config is missing! Check your .env.local file.");
    app = undefined;
  }
} else {
  app = getApp();
}

// Export services safely
const auth = app ? getAuth(app) : undefined;
const db = app ? getFirestore(app) : undefined;
const functions = app ? getFunctions(app) : undefined;
const analytics = undefined; // Set to undefined to avoid errors for now

export { app, auth, db, functions, analytics };