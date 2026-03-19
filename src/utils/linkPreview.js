/**
 * Lightweight URL extraction and preview metadata.
 * No server needed — uses URL patterns + Google favicon service.
 */

const URL_REGEX = /https?:\/\/[^\s<>"'`,;)}\]]+/gi;

export function extractUrls(text) {
  if (!text) return [];
  return [...new Set(text.match(URL_REGEX) || [])];
}

const YT_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const SPOTIFY_REGEX =
  /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/;

/**
 * Build preview metadata from a URL without any fetch.
 * Returns { url, domain, favicon, title, thumbnail, type }
 */
export function getPreviewMeta(url) {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    const base = { url, domain, favicon, title: null, thumbnail: null, type: "link" };

    // YouTube
    const ytMatch = url.match(YT_REGEX);
    if (ytMatch) {
      return {
        ...base,
        type: "youtube",
        title: "YouTube Video",
        thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
      };
    }

    // Spotify
    const spMatch = url.match(SPOTIFY_REGEX);
    if (spMatch) {
      return {
        ...base,
        type: "spotify",
        title: `Spotify ${spMatch[1].charAt(0).toUpperCase() + spMatch[1].slice(1)}`,
      };
    }

    return base;
  } catch {
    return null;
  }
}
