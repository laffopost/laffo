import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

/**
 * useBookmarks — real-time bookmark management.
 * Stores bookmarks in a top-level `bookmarks` collection.
 * Doc ID = `${userId}_${postId}` for easy lookup/dedup.
 */
export function useBookmarks() {
  const { firebaseUser } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const uid =
    firebaseUser && !firebaseUser.isAnonymous ? firebaseUser.uid : null;

  // Real-time subscription to user's bookmarks
  useEffect(() => {
    if (!uid) {
      setBookmarkedIds(new Set());
      return;
    }

    const q = query(
      collection(db, "bookmarks"),
      where("userId", "==", uid),
    );

    const unsub = onSnapshot(q, (snap) => {
      const ids = new Set();
      snap.forEach((d) => ids.add(d.data().postId));
      // Only update state if the set actually changed (avoid new Set identity on every snapshot)
      setBookmarkedIds((prev) => {
        if (prev.size === ids.size && [...prev].every((id) => ids.has(id))) {
          return prev;
        }
        return ids;
      });
    });

    return () => unsub();
  }, [uid]);

  const toggleBookmark = useCallback(
    async (postId) => {
      if (!uid) return;
      const bookmarkId = `${uid}_${postId}`;
      const ref = doc(db, "bookmarks", bookmarkId);

      if (bookmarkedIds.has(postId)) {
        // Optimistic remove
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        await deleteDoc(ref).catch(() => {
          setBookmarkedIds((prev) => new Set(prev).add(postId));
        });
      } else {
        // Optimistic add
        setBookmarkedIds((prev) => new Set(prev).add(postId));
        await setDoc(ref, {
          userId: uid,
          postId,
          createdAt: serverTimestamp(),
        }).catch(() => {
          setBookmarkedIds((prev) => {
            const next = new Set(prev);
            next.delete(postId);
            return next;
          });
        });
      }
    },
    [uid, bookmarkedIds],
  );

  const isBookmarked = useCallback(
    (postId) => bookmarkedIds.has(postId),
    [bookmarkedIds],
  );

  return { bookmarkedIds, toggleBookmark, isBookmarked };
}
