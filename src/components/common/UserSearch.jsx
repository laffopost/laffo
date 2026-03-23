import { useState, useRef, useEffect, useCallback } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { UsersIcon } from "../../utils/icons";
import "./UserSearch.css";

export default function UserSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const fetchUsers = useCallback(async (term) => {
    if (!term.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("username", ">=", term),
        where("username", "<=", term + "\uf8ff"),
        orderBy("username"),
        limit(8),
      );
      const snap = await getDocs(q);
      setResults(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 250);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  const handleSelect = (username) => {
    setOpen(false);
    setSearch("");
    setResults([]);
    navigate(`/profile/${encodeURIComponent(username)}`);
  };

  return (
    <div className="user-search-wrapper" ref={wrapperRef}>
      <button
        className={`user-search-trigger${open ? " active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Search users"
      >
        <UsersIcon size={15} />
      </button>

      {open && (
        <div className="user-search-dropdown">
          <input
            ref={inputRef}
            className="user-search-input"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && <div className="user-search-loading">Searching...</div>}
          {!loading && search.trim() && results.length === 0 && (
            <div className="user-search-empty">No users found</div>
          )}
          {results.map((user) => (
            <button
              key={user.uid}
              className="user-search-result"
              onClick={() => handleSelect(user.username)}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="user-search-avatar" />
              ) : (
                <div className="user-search-avatar user-search-avatar--placeholder">
                  {user.username?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <span className="user-search-username">@{user.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
