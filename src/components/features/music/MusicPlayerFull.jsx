import { MusicIcon, CloseIcon } from "../../../utils/icons";
import FirebaseChat from "../chat/FirebaseChat";
import VideoDisplay from "./VideoDisplay";
import TransportBar from "./TransportBar";
import GenreCarousel from "./GenreCarousel";
import StationList from "./StationList";

export default function MusicPlayerFull({
  // State
  isPlaying,
  isEmbed,
  isMuted,
  volume,
  showVolume,
  setShowVolume,
  selectedGenre,
  setSelectedGenre,
  currentStation,
  playerType,
  customUrl,
  setCustomUrl,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  showChat,
  setShowChat,
  fullSlotRef,
  // Handlers
  handleMinimize,
  handleClose,
  handleTogglePlay,
  handlePrevStation,
  handleNextStation,
  handleShuffle,
  handleToggleMute,
  handleVolumeChange,
  handlePlayCustom,
  handleSearch,
  handlePlayStation,
  playSearchResult,
  handleShareToPost,
  handleOpenStationInTab,
  getVolumeIcon,
}) {
  return (
    <div className="music-overlay" onClick={handleMinimize}>
      <div className="music-player" onClick={(e) => e.stopPropagation()}>
        <div className="music-header">
          <div className="music-header-left">
            <MusicIcon size={20} className="music-header-icon" style={{color: '#8b5cf6'}} />
            <h3>Music Player</h3>
          </div>
          <div className="header-btns">
            <button onClick={handleMinimize} title="Minimize">
              <span>–</span>
            </button>
            <button className="close-btn" onClick={handleClose} title="Close">
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        <div className="music-player-layout">
          <div className="music-content">
            <VideoDisplay
              isEmbed={isEmbed}
              playerType={playerType}
              currentStation={currentStation}
              isPlaying={isPlaying}
              selectedGenre={selectedGenre}
              fullSlotRef={fullSlotRef}
            />

            <TransportBar
              isPlaying={isPlaying}
              isEmbed={isEmbed}
              isMuted={isMuted}
              volume={volume}
              showVolume={showVolume}
              setShowVolume={setShowVolume}
              currentStation={currentStation}
              handleTogglePlay={handleTogglePlay}
              handlePrevStation={handlePrevStation}
              handleNextStation={handleNextStation}
              handleShuffle={handleShuffle}
              handleToggleMute={handleToggleMute}
              handleVolumeChange={handleVolumeChange}
              handleShareToPost={handleShareToPost}
              getVolumeIcon={getVolumeIcon}
            />

            {/* Custom URL */}
            <div className="custom-input-section">
              <div className="custom-input">
                <div className="custom-input-icon">🎧</div>
                <input
                  type="text"
                  placeholder="Paste YouTube, Spotify, or audio URL..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePlayCustom()}
                />
                <button className="url-action-btn play" onClick={handlePlayCustom}>▶ Play</button>
              </div>
            </div>

            {/* Music Search */}
            <div className="custom-input-section">
              <form onSubmit={handleSearch} className="music-search-form">
                <div className="custom-input">
                  <div className="custom-input-icon">🔍</div>
                  <input
                    type="text"
                    placeholder="Search for artists, songs... (e.g. AC/DC, Queen, Beatles)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isSearching}
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className={`url-action-btn search ${isSearching ? "searching" : ""}`}
                  >
                    {isSearching ? "🔄" : "🔍"} Search
                  </button>
                </div>
              </form>
              {searchResults.length > 0 && (
                <div className="search-results-info">
                  <span>
                    Found {searchResults.length} songs for "{searchQuery}"
                  </span>
                </div>
              )}
            </div>

            <GenreCarousel
              selectedGenre={selectedGenre}
              setSelectedGenre={setSelectedGenre}
            />

            <StationList
              selectedGenre={selectedGenre}
              searchResults={searchResults}
              currentStation={currentStation}
              isPlaying={isPlaying}
              handlePlayStation={handlePlayStation}
              playSearchResult={playSearchResult}
              handleShareToPost={handleShareToPost}
              handleOpenStationInTab={handleOpenStationInTab}
            />

            {/* Mobile-only Chat Toggle */}
            <div className="music-chat-toggle-bar">
              <button
                className={`music-chat-toggle-btn ${showChat ? "active" : ""}`}
                onClick={() => setShowChat((v) => !v)}
              >
                💬 {showChat ? "Hide Chat" : "Music Chat"}
              </button>
            </div>

            {/* Mobile-only Chat Panel */}
            {showChat && (
              <div className="music-chat-panel music-chat-mobile-only">
                <FirebaseChat collection="music-chat" variant="inline" />
              </div>
            )}
          </div>

          {/* Desktop Right-Side Chat Panel */}
          <div className="music-chat-sidebar">
            <div className="music-chat-sidebar-header">
              <span>💬</span> Music Chat
            </div>
            <FirebaseChat collection="music-chat" variant="inline" />
          </div>
        </div>
      </div>
    </div>
  );
}
