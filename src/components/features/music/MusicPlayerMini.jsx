import { PlayIcon, PauseIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "../../../utils/icons";
import { GENRE_ICONS } from "./musicConstants";

export default function MusicPlayerMini({
  currentStation,
  isPlaying,
  isEmbed,
  selectedGenre,
  volume,
  isMuted,
  showVolume,
  setShowVolume,
  miniSlotRef,
  handleRestore,
  handleClose,
  handleTogglePlay,
  handlePrevStation,
  handleNextStation,
  handleShuffle,
  handleVolumeChange,
  getVolumeIcon,
}) {
  return (
    <div className="music-minimized">
      <div className="mini-header">
        <div className="mini-header-info" onClick={handleRestore}>
          <span className={`mini-header-icon ${isPlaying ? "playing" : ""}`}>
            {isPlaying ? <PlayIcon size={18} /> : <PauseIcon size={18} />}
          </span>
          <div className="mini-header-text">
            <span className="mini-header-name">
              {currentStation?.name || "Music"}
            </span>
            <span className="mini-header-genre">
              {isPlaying
                ? `${GENRE_ICONS[selectedGenre] || "♪"} ${selectedGenre}`
                : "Paused"}
            </span>
          </div>
        </div>
        <div className="mini-header-actions">
          <button
            className="mini-hdr-btn expand"
            onClick={handleRestore}
            title="Maximize"
            style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}
          >
            ⤢
          </button>
          <button
            className="mini-hdr-btn close"
            onClick={handleClose}
            title="Close"
            style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      {/* Media display */}
      <div className="mini-media" onClick={handleRestore}>
        {isEmbed && currentStation ? (
          <div className="mini-iframe-slot" ref={miniSlotRef} />
        ) : (
          <div className="mini-visualizer-area">
            <div className="mini-visualizer">
              {isPlaying ? (
                [...Array(9)].map((_, i) => (
                  <div key={i} className="mini-vis-bar" />
                ))
              ) : (
                <div className="mini-vis-paused" style={{fontSize: '24px'}}>🎧</div>
              )}
            </div>
            {currentStation && (
              <div className="mini-vis-status" data-playing={isPlaying}>
                {isPlaying ? "● LIVE" : "⏸ PAUSED"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom transport controls */}
      <div className="mini-transport">
        <button
          className="mini-ctrl-btn shuffle"
          onClick={handleShuffle}
          title="Shuffle"
        >
          🎲
        </button>
        <button
          className="mini-ctrl-btn"
          onClick={handlePrevStation}
          title="Previous"
        >
          <ChevronLeftIcon size={18} />
        </button>
        <button
          className="mini-ctrl-btn play"
          onClick={handleTogglePlay}
          title={isPlaying ? "Pause" : "Play"}
          style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}
        >
          {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </button>
        <button
          className="mini-ctrl-btn"
          onClick={handleNextStation}
          title="Next"
        >
          <ChevronRightIcon size={18} />
        </button>
        {/* Volume only for audio streams — YouTube volume can't be controlled */}
        {!isEmbed && (
          <div className="mini-volume-wrap">
            <button
              className="mini-ctrl-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowVolume((v) => !v);
              }}
              title="Volume"
            >
              {getVolumeIcon()}
            </button>
            {showVolume && (
              <div
                className="mini-volume-popup"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="mini-volume-slider"
                  style={{ "--vol": `${volume}%` }}
                />
                <span className="mini-volume-val">{volume}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
