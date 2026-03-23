import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

/**
 * useFollow — real-time follow state + toggle for a given target user.
 * Returns null for isFollowing when the current user IS the target user
 * or is not logged in (caller should hide the button in that case).
 */
export function useFollow(targetUid) {
  const { firebaseUser } = useAuth();
  const { createFollowNotification } = useNotifications();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const canFollow =
    firebaseUser &&
    !firebaseUser.isAnonymous &&
    targetUid &&
    firebaseUser.uid !== targetUid;

  useEffect(() => {
    if (!canFollow) { setIsFollowing(false); return; }
    const docId = `${firebaseUser.uid}_${targetUid}`;
    const unsub = onSnapshot(doc(db, "follows", docId), (snap) =>
      setIsFollowing(snap.exists()),
    );
    return unsub;
  }, [canFollow, firebaseUser?.uid, targetUid]);

  const toggle = useCallback(async () => {
    if (!canFollow || loading) return;
    const docId = `${firebaseUser.uid}_${targetUid}`;
    const ref = doc(db, "follows", docId);
    setLoading(true);
    try {
      if (isFollowing) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          followerId: firebaseUser.uid,
          followingId: targetUid,
          createdAt: serverTimestamp(),
        });
        createFollowNotification(targetUid);
      }
    } finally {
      setLoading(false);
    }
  }, [canFollow, loading, isFollowing, firebaseUser?.uid, targetUid, createFollowNotification]);

  return { isFollowing, loading, canFollow, toggle };
}
