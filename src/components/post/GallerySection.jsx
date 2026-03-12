import { useState } from "react";
import "./GallerySection.css";

export default function GallerySection({
  title,
  emoji,
  images,
  scrollRef,
  onScroll,
  renderCard,
  sectionType,
  subtitle,
  layoutMode = "horizontal", // "horizontal" or "vertical"
  allowToggle = false,
  onRandomClick,
}) {
  const [currentLayout, setCurrentLayout] = useState(layoutMode);

  const toggleLayout = () => {
    setCurrentLayout((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal"
    );
  };

  const handleRandomClick = () => {
    if (images.length === 0) return;
    const randomIndex = Math.floor(Math.random() * images.length);
    const randomImage = images[randomIndex];
    if (onRandomClick) {
      onRandomClick(randomImage);
    }
  };

  return (
    <div
      className={`gallery-section ${
        sectionType === "trending" ? "trending-section-style" : ""
      } ${currentLayout === "vertical" ? "vertical-layout" : ""}`}
    >
      {title && (
        <div className="gallery-section-header">
          <div className="gallery-header-text">
            <div className="gallery-title-row">
              <h2 className="gallery-section-title">
                {emoji && <span className="title-emoji">{emoji}</span>}
                {title}
                <span className="gallery-post-count">({images.length})</span>
              </h2>
            </div>
            {subtitle && <p className="gallery-section-subtitle">{subtitle}</p>}
          </div>
          <div className="gallery-header-controls">
            {onRandomClick && (
              <button
                className="gallery-random-btn"
                onClick={handleRandomClick}
                disabled={images.length === 0}
                title="View random post"
              >
                🎲
              </button>
            )}
            {allowToggle && (
              <button
                className="gallery-view-toggle"
                onClick={toggleLayout}
                title={`Switch to ${
                  currentLayout === "horizontal" ? "grid" : "carousel"
                } view`}
              >
                {currentLayout === "horizontal" ? "📋" : "📊"}
              </button>
            )}
            {currentLayout === "horizontal" && (
              <div className="gallery-nav-buttons">
                <button
                  className="gallery-nav-btn"
                  onClick={() => onScroll(scrollRef, "left")}
                  aria-label="Scroll left"
                >
                  ‹
                </button>
                <button
                  className="gallery-nav-btn"
                  onClick={() => onScroll(scrollRef, "right")}
                  aria-label="Scroll right"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {currentLayout === "horizontal" ? (
        <div className="gallery-scrollable" ref={scrollRef}>
          <div className="gallery-grid">
            {images.map((image) => renderCard(image, sectionType))}
          </div>
        </div>
      ) : (
        <div className="gallery-vertical-grid">
          {images.map((image) => renderCard(image, sectionType))}
        </div>
      )}
    </div>
  );
}
