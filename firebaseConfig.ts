// Side-effect imports to ensure Firebase components are registered.
import "firebase/auth";
import "firebase/firestore";
import "firebase/functions";

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// FIX: This import is causing a build error. It's commented out and analytics is set to undefined below.
// import { getAnalytics } from "firebase/analytics";

// ================================================================================================
// FIX: Replaced Vite environment variables with placeholders.
// The app runs in an environment without a build step, so `import.meta.env` is not available.
// To use Firebase (by setting USE_FIREBASE_BACKEND to true), you must replace these placeholder values
// with your actual Firebase project configuration from the Firebase console.
// ================================================================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE",
  measurementId: "YOUR_MEASUREMENT_ID_HERE" // Optional
};


// Initialize Firebase
let app;
// Check if Firebase has already been initialized to prevent errors.
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app); // Optional: specify region if not us-central1, e.g., getFunctions(app, 'europe-west1')
// FIX: The `getAnalytics` function is causing an error, likely due to an environment/build issue.
// Setting analytics to undefined allows the app to build without breaking other parts that might import it.
const analytics = undefined;


export { app, auth, db, functions, analytics };