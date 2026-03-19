import { memo } from "react";
import CreatePostButton from "./CreatePostButton";

const FILTERS = [
  { value: "all", label: "All", emoji: "🖼️" },
  { value: "following", label: "Following", emoji: "👤" },
  { value: "saved", label: "Saved", emoji: "🔖" },
  { value: "sponsored", label: "Sponsored", emoji: "💎" },
  { value: "status", label: "Status", emoji: "👀" },
  { value: "poll", label: "Poll", emoji: "🎮" },
  { value: "media", label: "Media", emoji: "🎵" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "tech", label: "Tech", emoji: "💻" },
  { value: "food", label: "Food", emoji: "🍕" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "pov", label: "POV", emoji: "👀" },
  { value: "question", label: "Question", emoji: "❓" },
  { value: "news", label: "News", emoji: "📰" },
  { value: "crypto", label: "Crypto", emoji: "🪙" },
  { value: "memecoin", label: "Memecoin", emoji: "🐶" },
];

export { FILTERS };

const GalleryFilters = memo(function GalleryFilters({
  activeFilter,
  onFilterChange,
  search,
  onSearchChange,
  onCreatePost,
  onRandom,
  randomDisabled,
}) {
  return (
    <>
      <div className="create-post-search-row">
        <CreatePostButton onClick={onCreatePost} />
        <input
          className="gallery-search-main"
          type="text"
          placeholder="Search by title, author, content..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search posts by title, author, or content"
        />
        <button
          className="random-post-btn"
          onClick={onRandom}
          disabled={randomDisabled}
          title="View random post"
        >
          🎲
        </button>
      </div>

      <div className="gallery-filters-row">
        <div className="gallery-filters">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={`gallery-filter-btn${
                activeFilter === filter.value ? " active" : ""
              }${filter.value === "following" ? " gallery-filter-btn--following" : ""}`}
              onClick={() => onFilterChange(filter.value)}
            >
              {filter.emoji} {filter.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
});

export default GalleryFilters;
