import { PlayIcon, PauseIcon, ChevronLeftIcon, ChevronRightIcon, UploadIcon } from "../../../utils/icons";

export default function TransportBar({
  isPlaying,
  isEmbed,
  isMuted,
  volume,
  showVolume,
  setShowVolume,
  currentStation,
  handleTogglePlay,
  handlePrevStation,
  handleNextStation,
  handleShuffle,
  handleToggleMute,
  handleVolumeChange,
  handleShareToPost,
  getVolumeIcon,
}) {
  return (
    <div className="transport-bar">
      <div className="transport-left">
        <button
          className="transport-btn shuffle"
          onClick={handleShuffle}
          title="Shuffle"
        >
          🎲
        </button>
        <button
          className="transport-btn"
          onClick={handlePrevStation}
          title="Previous"
        >
          <ChevronLeftIcon size={18} />
        </button>
        <button
          className={`transport-btn play-main ${isPlaying ? "active" : ""}`}
          onClick={handleTogglePlay}
          title={isPlaying ? "Pause" : "Play"}
          style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}
        >
          {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </button>
        <button
          className="transport-btn"
          onClick={handleNextStation}
          title="Next"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
      <div className="transport-right">
        {currentStation && (
          <button
            className="transport-btn share-btn"
            onClick={() => handleShareToPost(currentStation)}
            title="Share to Post"
          >
            <UploadIcon size={16} style={{display: 'inline', marginRight: '4px'}} />
          </button>
        )}
        {/* Volume only for audio streams — YouTube volume can't be controlled */}
        {!isEmbed && (
          <>
            <button
              className="transport-btn volume-btn"
              onClick={handleToggleMute}
              onMouseEnter={() => setShowVolume(true)}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {getVolumeIcon()}
            </button>
            <div
              className={`volume-slider-wrap ${showVolume ? "visible" : ""}`}
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
                style={{ "--vol": `${volume}%` }}
              />
              <span className="volume-label">{volume}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
