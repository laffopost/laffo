import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

import logger from "../utils/logger";
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        const result = await signInAnonymously(auth);
        setFirebaseUser(result.user);
        setUserProfile(null);
      } else {
        setFirebaseUser(user);
        try {
          const userRef = doc(db, "users", user.uid);
          let userProfileData = null;
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            userProfileData = userDoc.data();
          }
          const updateData = {
            email: user.email,
            username: userProfileData?.username || user.email?.split("@")[0],
            uid: user.uid,
            createdAt: user.metadata?.creationTime || null,
            lastLogin: user.metadata?.lastSignInTime || null,
            lastSeen: serverTimestamp(),
          };
          await setDoc(userRef, updateData, { merge: true });
          const updatedDoc = await getDoc(userRef);
          const finalProfile = updatedDoc.exists() ? updatedDoc.data() : null;
          setUserProfile(finalProfile);
        } catch (err) {
          logger.error("Error loading user profile:", err);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Keep lastSeen fresh while user is browsing (every 2 minutes)
  useEffect(() => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;
    const interval = setInterval(
      async () => {
        try {
          await setDoc(
            doc(db, "users", firebaseUser.uid),
            { lastSeen: serverTimestamp() },
            { merge: true },
          );
        } catch (_err) {
          // Silently fail on lastSeen update
        }
      },
      2 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [firebaseUser]);

  const value = useMemo(
    () => ({ firebaseUser, userProfile, loading }),
    [firebaseUser, userProfile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
