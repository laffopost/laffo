import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

// LIVDSRZULELA is Tenor's official public demo key (no signup needed)
const TENOR_KEY = import.meta.env.VITE_TENOR_API_KEY || "LIVDSRZULELA";
const TENOR_BASE = "https://api.tenor.com/v1";
const LIMIT = 20;

export default function GifPicker({ anchorRef, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, left: 0, width: 300 });
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Position directly below the anchor, same width
  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [anchorRef]);

  // Load trending on open
  useEffect(() => {
    fetchGifs("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const fetchGifs = useCallback(async (q) => {
    setLoading(true);
    try {
      const endpoint = q.trim()
        ? `${TENOR_BASE}/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=${LIMIT}&media_filter=minimal&contentfilter=medium`
        : `${TENOR_BASE}/trending?key=${TENOR_KEY}&limit=${LIMIT}&media_filter=minimal&contentfilter=medium`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.results || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchGifs(q), 400);
  };

  // Close on outside click (ignore clicks on the anchor button itself)
  useEffect(() => {
    const handler = (e) => {
      if (
        !e.target.closest(".gif-picker-portal") &&
        !anchorRef?.current?.contains(e.target)
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  return createPortal(
    <div
      className="gif-picker-portal"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 999999,
      }}
    >
      <div className="gif-picker">
        <div className="gif-picker-header">
          <input
            ref={inputRef}
            className="gif-search-input"
            placeholder="Search GIFs…"
            value={query}
            onChange={handleSearch}
          />
          <button className="gif-picker-close" onClick={onClose}>✕</button>
        </div>
        <div className="gif-grid">
          {loading ? (
            <div className="gif-loading">Loading…</div>
          ) : gifs.length === 0 ? (
            <div className="gif-empty">No GIFs found</div>
          ) : (
            gifs.map((gif) => {
              // Tenor v1: media is an array of objects
              const formats = gif.media?.[0];
              const full = formats?.gif?.url;
              const preview = formats?.tinygif?.url || full;
              if (!full) return null;
              return (
                <button
                  key={gif.id}
                  className="gif-item"
                  onClick={() => onSelect({ url: full, preview, title: gif.title || gif.content_description })}
                >
                  <img src={preview} alt={gif.title} loading="lazy" />
                </button>
              );
            })
          )}
        </div>
        <div className="gif-powered">Powered by Tenor</div>
      </div>
    </div>,
    document.body
  );
}
