// ─── Post-related constants ───────────────────────────────────────
// Single source of truth for post timing, pagination, and emoji sets.

// Rate limiting
export const POST_COOLDOWN_MS = 15000; // 15 seconds between posts
export const COMMENT_COOLDOWN_MS = 5000; // 5 seconds between comments

// Pagination
export const INITIAL_LOAD_LIMIT = 15; // Load only 15 posts initially
export const PAGINATION_INCREMENT = 10; // Load 10 more on each "load more"
export const MAX_TOTAL_LOAD = 100; // Never load more than 100 total

// Reaction emojis — single source of truth for all components
export const REACTION_EMOJIS = ["😂", "🚀", "💎", "🔥", "❤️", "👍", "🎉", "💰"];

// Default reactions object for new posts
export const DEFAULT_REACTIONS = {
  "🔥": 0,
  "😂": 0,
  "🙌": 0,
  "🚀": 0,
  "👍": 0,
};

// Max file size for uploads (5 MB)
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
