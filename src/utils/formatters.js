// ─── Shared formatting utilities ─────────────────────────────────

/**
 * Format a Firestore Timestamp for display in messages/conversations.
 * Returns "Xd ago" for older messages, or HH:MM for today.
 * @param {import('firebase/firestore').Timestamp} ts
 * @returns {string}
 */
export function formatTime(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays > 0) return `${diffDays}d ago`;
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a number with K/M suffixes (e.g. 1500 → "1.5K").
 * @param {number} n
 * @returns {string}
 */
export function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Format a Date or Firestore Timestamp as a short locale date string.
 * @param {Date|import('firebase/firestore').Timestamp} ts
 * @returns {string}
 */
export function formatDate(ts) {
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
