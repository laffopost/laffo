import { memo } from "react";
import "./Skeleton.css";

/** Single skeleton card matching PostCard dimensions */
export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-thumbnail skeleton-pulse" />
      <div className="skeleton-info">
        <div className="skeleton-title skeleton-pulse" />
        <div className="skeleton-desc skeleton-pulse" />
        <div className="skeleton-reactions">
          <div className="skeleton-reaction skeleton-pulse" />
          <div className="skeleton-reaction skeleton-pulse" />
          <div className="skeleton-reaction skeleton-pulse" />
        </div>
      </div>
    </div>
  );
});

/** Grid of skeleton cards — used as loading placeholder for PostGallery */
export const SkeletonGallery = memo(function SkeletonGallery({ count = 6 }) {
  return (
    <div className="skeleton-gallery" aria-label="Loading posts">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
});

/** Single-line skeleton bar for inline loading states */
export const SkeletonLine = memo(function SkeletonLine({ width = "100%" }) {
  return (
    <div
      className="skeleton-line skeleton-pulse"
      style={{ width }}
      aria-hidden="true"
    />
  );
});
