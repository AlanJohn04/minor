import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCPM1uRfxHkweh9zgM-orv7y8tHRvZf83I",
  authDomain: "minor-4edc7.firebaseapp.com",
  projectId: "minor-4edc7",
  storageBucket: "minor-4edc7.firebasestorage.app",
  messagingSenderId: "179490470155",
  appId: "1:179490470155:web:00343b847fee98cf608a0e",
  measurementId: "G-DGCTBP90LG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    return null;
  }
};

export const logout = () => signOut(auth);
