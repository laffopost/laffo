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
      } else if (user.isAnonymous) {
        setFirebaseUser(user);
        setUserProfile(null);
      } else {
        setFirebaseUser(user);
        try {
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          let userProfileData = userDoc.exists() ? userDoc.data() : null;

          const updateData = {
            email: user.email,
            username: userProfileData?.username || user.email?.split("@")[0],
            uid: user.uid,
            createdAt: user.metadata?.creationTime || null,
            lastLogin: user.metadata?.lastSignInTime || null,
            lastSeen: serverTimestamp(),
          };

          await setDoc(userRef, updateData, { merge: true });
          // Merge existing Firestore data with login-time updates so avatar/status/etc are preserved
          setUserProfile({ ...userProfileData, ...updateData });
        } catch (err) {
          logger.error("Error loading user profile:", err);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Keep lastSeen fresh while user is browsing (every 1 minute)
  useEffect(() => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;
    const uid = firebaseUser.uid;
    const userRef = doc(db, "users", uid);

    const ping = async () => {
      try {
        await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
      } catch (_err) {}
    };

    const interval = setInterval(ping, 2 * 60 * 1000);

    // Best-effort: mark offline when tab is hidden / window closed
    const onVisibilityChange = () => {
      if (document.hidden) {
        // Use sendBeacon-style best-effort — Firestore doesn't support it,
        // so we write a past timestamp and accept it may occasionally fail
        setDoc(userRef, { lastSeen: new Date(0) }, { merge: true }).catch(() => {});
      } else {
        ping();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
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
