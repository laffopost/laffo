import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <-- add this

const firebaseConfig = {
  apiKey: "AIzaSyCoC52JPGP5lVJ_oIXXlTvcudm1_YfAZM4",
  authDomain: "laughcoin-chat.firebaseapp.com",
  projectId: "laughcoin-chat",
  storageBucket: "laughcoin-chat.appspot.com", // <-- fix typo: .app to .com
  messagingSenderId: "914042723141",
  appId: "1:914042723141:web:8835e705c91b899f673c2c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // <-- export storage

export default app;
