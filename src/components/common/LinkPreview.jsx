import { useMemo } from "react";
import { extractUrls, getPreviewMeta } from "../../utils/linkPreview";
import "./LinkPreview.css";

/**
 * Renders a compact link-preview card for the first URL found in `text`.
 * No external fetch — uses URL patterns + favicon service.
 */
export default function LinkPreview({ text }) {
  const meta = useMemo(() => {
    const urls = extractUrls(text);
    return urls.length > 0 ? getPreviewMeta(urls[0]) : null;
  }, [text]);

  if (!meta) return null;

  return (
    <a
      href={meta.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`link-preview link-preview--${meta.type}`}
      onClick={(e) => e.stopPropagation()}
    >
      {meta.thumbnail && (
        <img
          src={meta.thumbnail}
          alt=""
          className="link-preview-thumb"
          loading="lazy"
        />
      )}
      <div className="link-preview-body">
        {meta.title && <span className="link-preview-title">{meta.title}</span>}
        <span className="link-preview-domain">
          <img src={meta.favicon} alt="" className="link-preview-favicon" />
          {meta.domain}
        </span>
      </div>
    </a>
  );
}
