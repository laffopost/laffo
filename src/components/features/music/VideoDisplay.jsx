import { GENRE_ICONS } from "./musicConstants";

export default function VideoDisplay({
  isEmbed,
  playerType,
  currentStation,
  isPlaying,
  selectedGenre,
  fullSlotRef,
}) {
  if (isEmbed && currentStation) {
    return (
      <div className="video-player">
        <div className="full-iframe-slot" ref={fullSlotRef} />
      </div>
    );
  }

  if (playerType === "audio" && currentStation) {
    return (
      <div className="video-player">
        <div className="audio-player-display">
          <div className="audio-player-top">
            <div className="audio-album-art">
              <div className="audio-visualizer">
                {isPlaying ? (
                  <>
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="audio-bar" />
                    ))}
                  </>
                ) : (
                  <div className="audio-paused">🎧</div>
                )}
              </div>
            </div>
          </div>
          <div className="audio-info">
            <div className="audio-genre-tag">
              {GENRE_ICONS[selectedGenre]} {selectedGenre}
            </div>
            <div className="audio-title">{currentStation.name}</div>
            <div
              className="audio-status-badge"
              data-playing={isPlaying}
            >
              {isPlaying ? "● LIVE" : "⏸ PAUSED"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player">
      <div className="video-placeholder">
        <div className="placeholder-icon">🎧</div>
        <p>Select a station or paste a URL</p>
        <span className="placeholder-hint">
          Music auto-plays when you pick a station
        </span>
      </div>
    </div>
  );
}
