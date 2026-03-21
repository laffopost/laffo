import { UploadIcon } from "../../../utils/icons";
import { STATIONS, getSourceBadge } from "./musicConstants";

export default function StationList({
  selectedGenre,
  searchResults,
  currentStation,
  isPlaying,
  handlePlayStation,
  playSearchResult,
  handleShareToPost,
  handleOpenStationInTab,
}) {
  if (selectedGenre === "Search") {
    return (
      <div className="stations-container">
        <div className="search-results">
          {searchResults.length === 0 ? (
            <div className="search-empty">
              <div className="search-empty-icon">🔍</div>
              <p>Search for your favorite artists and songs!</p>
              <span className="search-empty-hint">
                Try searching for: "AC/DC", "Queen", "Beatles",
                "Taylor Swift"
              </span>
            </div>
          ) : (
            <div className="stations search-stations scrollable-results">
              {searchResults.map((result) => {
                const isCurrent =
                  currentStation?.name === result.title && isPlaying;
                return (
                  <button
                    key={result.id}
                    className={`station-item search-result ${isCurrent ? "active" : ""}`}
                    onClick={() => playSearchResult(result)}
                  >
                    <span className="station-playing-indicator">
                      {isCurrent ? "▶" : ""}
                    </span>
                    <div className="search-result-info">
                      <span className="search-result-title">
                        {result.title}
                      </span>
                      <span className="search-result-meta">
                        {result.artist} • {result.duration}
                      </span>
                    </div>
                    <button
                      className="station-share-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareToPost({
                          name: result.title,
                          url: `https://www.youtube.com/watch?v=${result.youtubeId}`,
                          originalUrl: `https://www.youtube.com/watch?v=${result.youtubeId}`,
                          artist: result.artist,
                        });
                      }}
                      title="Share to Post"
                    >
                      <UploadIcon size={16} style={{display: 'inline', marginRight: '4px'}} />
                    </button>
                    <span
                      className="station-badge"
                      style={{ backgroundColor: "#FF0000" }}
                    >
                      📺 YouTube
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="stations-container">
      <div className="stations">
        {STATIONS[selectedGenre]?.map((station, i) => {
          const badge = getSourceBadge(station.type);
          const isCurrent =
            currentStation?.name === station.name && isPlaying;
          return (
            <button
              key={i}
              className={`station-item ${isCurrent ? "active" : ""}`}
              onClick={() => handlePlayStation(station)}
            >
              <span className="station-playing-indicator">
                {isCurrent ? "▶" : ""}
              </span>
              <span className="station-name">{station.name}</span>
              {(station.type === "youtube") && (
                <button
                  className="station-share-btn"
                  onClick={(e) => { e.stopPropagation(); handleShareToPost(station); }}
                  title="Share to Post"
                >
                  <UploadIcon size={16} style={{display: 'inline', marginRight: '4px'}} />
                </button>
              )}
              <span
                className="station-badge clickable"
                style={{ backgroundColor: badge.color }}
                onClick={(e) => handleOpenStationInTab(e, station)}
                title="Open in new tab"
              >
                {badge.icon} {badge.label} ↗
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
