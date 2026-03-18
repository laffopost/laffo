import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export function useUnreadMessageCount() {
  const { firebaseUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const uid = (!firebaseUser || firebaseUser.isAnonymous) ? null : firebaseUser.uid;

  useEffect(() => {
    if (!uid) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid),
    );

    let cancelled = false;
    const unsub = onSnapshot(q, (snap) => {
      if (cancelled) return;
      let unread = 0;
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.lastSenderId !== uid && !data[`read_${uid}`] && data.lastMessage) {
          unread++;
        }
      });
      setUnreadCount(unread);
    });

    return () => {
      cancelled = true;
      setTimeout(() => { try { unsub(); } catch {} }, 0);
    };
  }, [uid]);

  return unreadCount;
}
