import { useState } from "react";
import { createPortal } from "react-dom";
import "./ReactorsModal.css";

export default function ReactorsModal({ reactors, reactionCounts, onClose }) {
  const entries = Object.values(reactors || {});
  const emojiGroups = [...new Set(entries.map((r) => r.emoji))];
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? entries : entries.filter((r) => r.emoji === filter);

  // Total from counts covers legacy reactions that predate the reactors field
  const totalFromCounts = Object.values(reactionCounts || {})
    .filter((c) => c > 0)
    .reduce((a, b) => a + b, 0);
  const displayTotal = entries.length > 0 ? entries.length : totalFromCounts;
  const hasLegacy = totalFromCounts > entries.length;

  return createPortal(
    <div className="reactors-overlay" onClick={onClose}>
      <div className="reactors-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reactors-header">
          <span className="reactors-title">Reactions</span>
          <button className="reactors-close" onClick={onClose}>✕</button>
        </div>
        <div className="reactors-tabs">
          <button
            className={`reactors-tab${filter === "all" ? " active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All {displayTotal}
          </button>
          {emojiGroups.map((emoji) => (
            <button
              key={emoji}
              className={`reactors-tab${filter === emoji ? " active" : ""}`}
              onClick={() => setFilter(emoji)}
            >
              {emoji} {entries.filter((r) => r.emoji === emoji).length}
            </button>
          ))}
        </div>
        <div className="reactors-list">
          {filtered.length === 0 ? (
            <div className="reactors-empty">
              {hasLegacy
                ? "Re-react to appear here — older reactions don't have user data yet."
                : "No reactions yet"}
            </div>
          ) : (
            filtered.map((r, i) => (
              <div key={i} className="reactor-item">
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="reactor-avatar" />
                ) : (
                  <span className="reactor-avatar-placeholder">
                    {r.name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
                <span className="reactor-name">{r.name}</span>
                <span className="reactor-emoji">{r.emoji}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
