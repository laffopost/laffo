import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { CloseIcon } from "../../utils/icons";
import { useNavigate } from "react-router-dom";
import "./FollowListModal.css";

export default function FollowListModal({ isOpen, onClose, userId, mode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;
    async function fetchUsers() {
      setLoading(true);
      setUsers([]);

      try {
        const field = mode === "followers" ? "followingId" : "followerId";
        const targetField = mode === "followers" ? "followerId" : "followingId";

        const q = query(
          collection(db, "follows"),
          where(field, "==", userId),
        );
        const snap = await getDocs(q);

        const userIds = snap.docs.map((d) => d.data()[targetField]);

        // Fetch user profiles in parallel
        const profiles = await Promise.all(
          userIds.map(async (uid) => {
            try {
              const userDoc = await getDoc(doc(db, "users", uid));
              if (userDoc.exists()) {
                return { uid, ...userDoc.data() };
              }
              return { uid, username: "Unknown" };
            } catch {
              return { uid, username: "Unknown" };
            }
          }),
        );

        if (!cancelled) {
          setUsers(profiles);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setLoading(false);
        }
      }
    }

    fetchUsers();
    return () => { cancelled = true; };
  }, [isOpen, userId, mode]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = mode === "followers" ? "Followers" : "Following";

  return (
    <div className="follow-list-overlay" onClick={onClose}>
      <div
        className="follow-list-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="follow-list-header">
          <h2 className="follow-list-title">{title}</h2>
          <button
            className="follow-list-close close-btn"
            onClick={onClose}
            title="Close (ESC)"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="follow-list-body">
          {loading ? (
            <div className="follow-list-loading">
              <div className="follow-list-spinner" />
              <span>Loading...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="follow-list-empty">
              {mode === "followers"
                ? "No followers yet"
                : "Not following anyone yet"}
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.uid}
                className="follow-list-item"
                onClick={() => {
                  onClose();
                  navigate(`/profile/${user.username}`);
                }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="follow-list-avatar"
                  />
                ) : (
                  <div className="follow-list-avatar follow-list-avatar--fallback">
                    {(user.username || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="follow-list-user-info">
                  <span className="follow-list-username">
                    @{user.username || "unknown"}
                  </span>
                  {user.status && (
                    <span className="follow-list-status">{user.status}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
