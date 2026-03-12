import { useEffect } from "react";
import "./MediaPlayer.css";

import logger from "../../utils/logger";
export default function MediaPlayer({ image }) {
  useEffect(() => {
    logger.log(
      "📺 MediaPlayer - Received image object keys:",
      Object.keys(image || {})
    );
    logger.log(
      "📺 MediaPlayer - Full image data:",
      JSON.stringify(image, null, 2)
    );
    logger.log("📺 MediaPlayer - Type:", image?.type);
    logger.log("📺 MediaPlayer - Media Type:", image?.mediaType);
    logger.log("📺 MediaPlayer - Embed URL:", image?.embedUrl);
    logger.log("📺 MediaPlayer - Media URL:", image?.mediaUrl);

    if (image?.type === "media" && !image?.embedUrl) {
      logger.error("⚠️ MediaPlayer - Media post missing embedUrl!");
      logger.error(
        "⚠️ MediaPlayer - This indicates the post was not saved correctly"
      );
    }
  }, [image]);

  if (!image) {
    logger.log("❌ MediaPlayer - No image data provided");
    return (
      <div className="media-player-error">
        <p>⚠️ No media data</p>
      </div>
    );
  }

  // Check if it's a media post
  if (image.type !== "media") {
    logger.log("❌ MediaPlayer - Not a media post, type:", image.type);
    return null;
  }

  if (!image.embedUrl) {
    logger.log("❌ MediaPlayer - No embedUrl found");
    return (
      <div className="media-player-error">
        <p>⚠️ Media URL not available</p>
        <small
          style={{ fontSize: "0.8rem", marginTop: "0.5rem", display: "block" }}
        >
          Type: {image.type} | Media Type: {image.mediaType || "unknown"}
        </small>
        <small
          style={{ fontSize: "0.7rem", marginTop: "0.25rem", display: "block" }}
        >
          Post ID: {image.id}
        </small>
      </div>
    );
  }

  logger.log("✅ MediaPlayer - Rendering iframe with URL:", image.embedUrl);

  const isSpotify = image.mediaType === "spotify";
  const isYouTube = image.mediaType === "youtube";

  return (
    <div
      className={`media-player-container ${isSpotify ? "spotify" : "youtube"}`}
    >
      {isYouTube && (
        <iframe
          src={image.embedUrl}
          className="media-player-iframe youtube-player"
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title={image.title || "YouTube Video"}
        />
      )}
      {isSpotify && (
        <iframe
          src={image.embedUrl}
          className="media-player-iframe spotify-player"
          width="100%"
          height="352"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={image.title || "Spotify Media"}
        />
      )}
    </div>
  );
}
