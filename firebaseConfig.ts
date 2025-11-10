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
// TODO: החלף את הערכים הבאים בפרטי התצורה של פרויקט ה-Firebase שלך!
// ================================================================================================
const firebaseConfig = {
  apiKey: process.env.GOOGLE_API_KEY, // <-- החלף כאן!
  authDomain: "your-project-id.firebaseapp.com", // <-- החלף כאן!
  projectId: "your-project-id", // <-- החלף כאן!
  storageBucket: "your-project-id.appspot.com", // <-- החלף כאן!
  messagingSenderId: "1234567890", // <-- החלף כאן!
  appId: "1:1234567890:web:XXXXXX", // <-- החלף כאן!
  measurementId: "G-XXXXXXX" // אופציונלי
};
// ================================================================================================
// סוף אזור ההגדרות שיש לעדכן
// ================================================================================================


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
