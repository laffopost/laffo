import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export function useUnreadMessageCount() {
  const { firebaseUser, userProfile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!firebaseUser || firebaseUser.isAnonymous) {
      setUnreadCount(0);
      return;
    }

    const currentUser = {
      uid: firebaseUser.uid,
      name: userProfile?.username || firebaseUser.displayName || "User",
    };

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
    );

    const unsub = onSnapshot(q, (snap) => {
      let unread = 0;
      snap.forEach((doc) => {
        const data = doc.data();
        // Count unread messages
        if (
          data.lastSenderId !== currentUser.uid &&
          !data[`read_${currentUser.uid}`] &&
          data.lastMessage
        ) {
          unread++;
        }
      });
      setUnreadCount(unread);
    });

    return () => unsub();
  }, [firebaseUser, userProfile]);

  return unreadCount;
}
