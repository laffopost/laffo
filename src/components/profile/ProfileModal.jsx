import { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import {
  doc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import "./ProfileModal.css";

export default function ProfileModal({ username, uid, open = true }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setProfile(null);
    setLoading(true);

    async function fetchProfile() {
      let userData = null;
      if (uid) {
        const docRef = doc(db, "users", uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) userData = snap.data();
      } else if (username) {
        const q = query(
          collection(db, "users"),
          where("username", "==", username.toLowerCase()),
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) userData = snapshot.docs[0].data();
      }
      setProfile(userData);
      setLoading(false);
    }

    fetchProfile();
  }, [username, uid, open]);

  if (!open) return null;

  return (
    <div
      className="profile-modal-content"
      style={{ boxShadow: "none", background: "transparent", padding: 0 }}
    >
      {loading ? (
        <div className="profile-modal-loading">Loading...</div>
      ) : profile ? (
        <div className="profile-modal-main">
          <div className="profile-modal-avatar">
            {profile.avatar ? (
              <img src={profile.avatar} alt="avatar" />
            ) : (
              <span className="profile-modal-avatar-fallback">
                {profile.username?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          <div className="profile-modal-username">@{profile.username}</div>
          <div className="profile-modal-status">{profile.status}</div>
          <div className="profile-modal-info">
            <div>
              <b>Email:</b> {profile.email}
            </div>
            <div>
              <b>Location:</b> {profile.location || "N/A"}
            </div>
            <div>
              <b>Birthday:</b> {profile.birthday || "N/A"}
            </div>
            <div>
              <b>Favorite Song:</b> {profile.favoriteSong || "N/A"}
            </div>
            <div>
              <b>Solana:</b> {profile.solana || "N/A"}
            </div>
          </div>
        </div>
      ) : (
        <div className="profile-modal-loading">User not found.</div>
      )}
    </div>
  );
}
