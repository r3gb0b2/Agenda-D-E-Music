import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDsi6VpfhLQW8UWgAp5c4TRV7vqOkDyauU",
  authDomain: "stingressos-e0a5f.firebaseapp.com",
  projectId: "stingressos-e0a5f",
  storageBucket: "stingressos-e0a5f.firebasestorage.app",
  messagingSenderId: "424186734009",
  appId: "1:424186734009:web:385f6c645a3ace2f784268",
  measurementId: "G-JTEQ46VCRY"
};

let app = null;
let dbFirestore = null;
let auth = null;

const initFirebase = () => {
  try {
    // Basic validation to check if config seems real
    const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey.length > 20 && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI";

    if (isConfigured) {
      app = initializeApp(firebaseConfig);
      // Initialize services safely
      try {
        dbFirestore = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase initialized successfully.");
      } catch (serviceError) {
        console.warn("Firebase App initialized, but services (Firestore/Auth) failed:", serviceError);
        // Reset to null so the app falls back to local storage
        dbFirestore = null;
        auth = null;
      }
    } else {
      console.warn("Firebase keys incomplete. Running in Demo Mode.");
    }
  } catch (error) {
    console.error("Critical: Failed to initialize Firebase App.", error);
    app = null;
    dbFirestore = null;
    auth = null;
  }
};

initFirebase();

export { dbFirestore, auth };
