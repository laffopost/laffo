import { useState, useRef, useEffect, useCallback } from "react";
import { usePostActions } from "../../../context/PostContext";
import toast from "react-hot-toast";
import AddPostModal from "../../post/AddPostModal";
import { MusicIcon, VolumeUpIcon, VolumeMuteIcon } from "../../../utils/icons";
import { STATIONS, getEmbedUrl } from "./musicConstants";
import MusicPlayerMini from "./MusicPlayerMini";
import MusicPlayerFull from "./MusicPlayerFull";
import "./MusicPlayer.css";

export default function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("Lofi");
  const [customUrl, setCustomUrl] = useState("");
  const [currentStation, setCurrentStation] = useState(null);
  const [playerType, setPlayerType] = useState(null);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  // Music search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showChat, setShowChat] = useState(false);
  const [shareData, setShareData] = useState(null);
  const { addPost } = usePostActions();

  const audioRef = useRef(null);
  const iframeRef = useRef(null);
  const iframeHostRef = useRef(null);
  const miniSlotRef = useRef(null);
  const fullSlotRef = useRef(null);
  const prevVolumeRef = useRef(80);

  // YouTube iframes don't expose volume control — hide volume UI for embeds
  const isEmbed = playerType === "embed";

  // YouTube Search using YouTube Data API v3
  const searchYouTubeMusic = useCallback(async (query) => {
    if (!query.trim()) return [];

    setIsSearching(true);
    try {
      const API_KEY =
        import.meta.env.VITE_YOUTUBE_API_KEY || "YOUR_YOUTUBE_API_KEY";

      if (!API_KEY || API_KEY === "YOUR_YOUTUBE_API_KEY") {
        toast.error(
          "YouTube API key not configured. Please add VITE_YOUTUBE_API_KEY to your .env file",
        );
        console.error(
          "YouTube API key missing. Get one from: https://console.cloud.google.com/apis/credentials",
        );
        return [];
      }

      const searchUrl =
        `https://www.googleapis.com/youtube/v3/search?` +
        `key=${API_KEY}&` +
        `part=snippet&` +
        `q=${encodeURIComponent(query)}&` +
        `type=video&` +
        `maxResults=10&` +
        `order=relevance&` +
        `videoEmbeddable=true&` +
        `videoSyndicated=true`;

      console.log("🎵 [YouTube API] Searching for:", query);

      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(
          `YouTube API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        toast.info("No videos found for your search");
        return [];
      }

      const videoIds = data.items.map((item) => item.id.videoId).join(",");
      const detailsUrl =
        `https://www.googleapis.com/youtube/v3/videos?` +
        `key=${API_KEY}&` +
        `part=contentDetails,statistics&` +
        `id=${videoIds}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      const formatDuration = (isoDuration) => {
        const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = (match[1] || "").replace("H", "");
        const minutes = (match[2] || "").replace("M", "");
        const seconds = (match[3] || "").replace("S", "");

        let formatted = "";
        if (hours) formatted += `${hours}:`;
        formatted += `${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
        return formatted;
      };

      const results = data.items.map((item) => {
        const videoDetails = detailsData.items.find(
          (detail) => detail.id === item.id.videoId,
        );
        const duration = videoDetails
          ? formatDuration(videoDetails.contentDetails.duration)
          : "0:00";

        return {
          id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          duration: duration,
          thumbnail:
            item.snippet.thumbnails.medium?.url ||
            item.snippet.thumbnails.default?.url,
          youtubeId: item.id.videoId,
          publishedAt: item.snippet.publishedAt,
          description: item.snippet.description,
          viewCount: videoDetails?.statistics.viewCount || "0",
        };
      });

      console.log(
        `🎵 [YouTube API] Found ${results.length} videos for "${query}"`,
      );
      return results;
    } catch (error) {
      console.error("YouTube search error:", error);
      toast.error(`Search failed: ${error.message}`);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!searchQuery.trim()) return;

      console.log("🎵 [Search] Searching for:", searchQuery);
      const results = await searchYouTubeMusic(searchQuery);
      setSearchResults(results);
      setSelectedGenre("Search");
      toast.success(`Found ${results.length} songs!`);
    },
    [searchQuery, searchYouTubeMusic],
  );

  const playSearchResult = useCallback((result) => {
    const youtubeUrl = `https://www.youtube.com/embed/${result.youtubeId}?autoplay=1&mute=0&enablejsapi=1&origin=${window.location.origin}`;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    setPlayerType("embed");
    setCurrentStation({
      name: result.title,
      url: youtubeUrl,
      type: "youtube",
      originalUrl: `https://www.youtube.com/watch?v=${result.youtubeId}`,
      artist: result.artist,
      duration: result.duration,
    });
    setIsPlaying(true);
    setSelectedGenre("Search");

    toast.success(`Now playing: ${result.title}`);
  }, []);

  const handlePlayStation = useCallback(
    (station) => {
      if (station.type === "youtube") {
        const embedUrl = getEmbedUrl(station.url);
        if (embedUrl) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
          }
          setPlayerType("embed");
          setCurrentStation({
            ...station,
            url: embedUrl,
            originalUrl: station.url,
          });
          setIsPlaying(true);
        }
      } else if (station.type === "audio") {
        if (audioRef.current) {
          audioRef.current.src = station.url;
          audioRef.current.volume = volume / 100;
          audioRef.current.play().catch(() => {});
        }
        setPlayerType("audio");
        setCurrentStation(station);
        setIsPlaying(true);
      }
    },
    [volume],
  );

  const handlePlayCustom = () => {
    const embedUrl = getEmbedUrl(customUrl);
    if (embedUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setPlayerType("embed");
      setCurrentStation({
        name: "Custom",
        url: embedUrl,
        type: "embed",
        originalUrl: customUrl,
      });
      setIsPlaying(true);
    } else if (
      customUrl.match(/\.(mp3|ogg|wav|m4a)$/i) ||
      customUrl.includes("stream")
    ) {
      if (audioRef.current) {
        audioRef.current.src = customUrl;
        audioRef.current.volume = volume / 100;
        audioRef.current.play().catch(() => {});
      }
      setPlayerType("audio");
      setCurrentStation({
        name: "Custom Audio",
        url: customUrl,
        type: "audio",
      });
      setIsPlaying(true);
    } else {
      toast.error("Please enter a valid YouTube, Spotify, or audio stream URL");
    }
  };

  // Send play/pause command to YouTube iframe via postMessage API
  const postYouTubeCommand = useCallback((command) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: command, args: [] }),
        "*",
      );
    } catch { /* cross-origin — ignore */ }
  }, []);

  const handleTogglePlay = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      if (playerType === "audio" && audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      } else if (playerType === "embed") {
        if (isPlaying) {
          postYouTubeCommand("pauseVideo");
        } else {
          postYouTubeCommand("playVideo");
        }
        setIsPlaying((p) => !p);
      }
    },
    [playerType, isPlaying, postYouTubeCommand],
  );

  const getCurrentStations = useCallback(() => {
    if (selectedGenre === "Search") {
      return searchResults;
    }
    return STATIONS[selectedGenre] || [];
  }, [selectedGenre, searchResults]);

  const handleNextStation = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      const stations = getCurrentStations();
      if (!stations.length) return;
      const idx = stations.findIndex((s) => s.name === currentStation?.name);
      handlePlayStation(stations[(idx + 1) % stations.length]);
    },
    [getCurrentStations, currentStation, handlePlayStation],
  );

  const handlePrevStation = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      const stations = getCurrentStations();
      if (!stations.length) return;
      const idx = stations.findIndex((s) => s.name === currentStation?.name);
      handlePlayStation(stations[idx <= 0 ? stations.length - 1 : idx - 1]);
    },
    [getCurrentStations, currentStation, handlePlayStation],
  );

  const handleShuffle = (e) => {
    if (e) e.stopPropagation();
    const all = Object.values(STATIONS).flat();
    const pick = all[Math.floor(Math.random() * all.length)];
    for (const [genre, list] of Object.entries(STATIONS)) {
      if (list.includes(pick)) {
        setSelectedGenre(genre);
        break;
      }
    }
    handlePlayStation(pick);
  };

  const handleVolumeChange = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) audioRef.current.volume = v / 100;
  };

  const handleToggleMute = (e) => {
    if (e) e.stopPropagation();
    if (isMuted) {
      const r = prevVolumeRef.current || 80;
      setVolume(r);
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = r / 100;
    } else {
      prevVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  const handleOpenStationInTab = (e, station) => {
    e.stopPropagation();
    window.open(
      station.originalUrl || station.url,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleShareToPost = useCallback((station) => {
    const url = station.originalUrl || station.url;
    if (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("spotify.com")) {
      setShareData({
        url,
        title: station.name || station.title || "",
        artist: station.artist || "",
      });
    } else {
      toast.error("Only YouTube and Spotify links can be shared as posts");
    }
  }, []);

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
    setShowVolume(false);
  };
  const handleRestore = () => {
    setIsMinimized(false);
    setIsOpen(true);
    setShowVolume(false);
  };
  const handleClose = () => {
    if (isPlaying) {
      if (playerType === "audio" && audioRef.current) {
        audioRef.current.pause();
      } else if (playerType === "embed") {
        postYouTubeCommand("pauseVideo");
      }
      setIsPlaying(false);
    }
    setIsOpen(false);
    setIsMinimized(false);
    setShowVolume(false);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeMuteIcon size={18} />;
    } else if (volume < 40) {
      return <VolumeMuteIcon size={18} />;
    } else {
      return <VolumeUpIcon size={18} />;
    }
  };

  // ── Effects ──────────────────────────────────────────────────────

  // Auto-play first station only on the very first open
  useEffect(() => {
    if (isOpen && !currentStation) {
      const first = STATIONS[selectedGenre]?.[0];
      if (first) {
        handlePlayStation(first);
      }
    }
  }, [isOpen, currentStation, selectedGenre, handlePlayStation]);

  // Audio element listeners
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  // Create/destroy iframe when station changes
  useEffect(() => {
    if (!isEmbed || !currentStation) {
      if (iframeRef.current) {
        iframeRef.current.remove();
        iframeRef.current = null;
      }
      return;
    }

    if (!iframeRef.current || iframeRef.current.dataset.src !== currentStation.url) {
      if (iframeRef.current) iframeRef.current.remove();

      const iframe = document.createElement("iframe");
      iframe.src = currentStation.url;
      iframe.width = "100%";
      iframe.height = "100%";
      iframe.style.border = "none";
      iframe.style.display = "block";
      iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      iframe.title = "player";
      iframe.dataset.src = currentStation.url;
      iframeRef.current = iframe;

      if (iframeHostRef.current) {
        iframeHostRef.current.appendChild(iframe);
      }
    }
  }, [isEmbed, currentStation]);

  // Position iframe-host over whichever slot is visible
  useEffect(() => {
    const host = iframeHostRef.current;
    if (!host || !isEmbed || !currentStation) {
      if (host) host.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;overflow:hidden;pointer-events:none";
      return;
    }

    const target = isMinimized ? miniSlotRef.current : isOpen ? fullSlotRef.current : null;

    if (!target) {
      host.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;overflow:hidden;pointer-events:none";
      return;
    }

    const sync = () => {
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const radius = isMinimized ? "0" : "16px";
      host.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;z-index:99999;overflow:hidden;pointer-events:${isMinimized ? "none" : "auto"};border-radius:${radius}`;
    };

    sync();
    const t1 = requestAnimationFrame(sync);
    const t2 = setTimeout(sync, 350);
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", sync);
    };
  }, [isOpen, isMinimized, isEmbed, currentStation]);

  // Cleanup iframe on unmount
  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        iframeRef.current.remove();
        iframeRef.current = null;
      }
    };
  }, []);

  // Space bar shortcut
  useEffect(() => {
    const fn = (e) => {
      if (!isOpen && !isMinimized) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [isOpen, isMinimized, handleTogglePlay]);

  // Determine which view is active
  const isClosed = !isOpen && !isMinimized;

  return (
    <>
      {/* Single persistent audio element — never unmounts */}
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      {/* Persistent iframe host — JS positions it over the active slot */}
      <div className="iframe-host" ref={iframeHostRef} />

      {/* ── FAB (closed state) ─────────────────────────────────────── */}
      {isClosed && (
        <button
          className="music-open"
          onClick={() => setIsOpen(true)}
          title="Open Music Player"
        >
          <MusicIcon size={20} className="music-open-icon" style={{color: '#ffffff'}} />
          <span className="music-open-pulse" />
        </button>
      )}

      {/* ── Minimized card ─────────────────────────────────────────── */}
      {isMinimized && (
        <MusicPlayerMini
          currentStation={currentStation}
          isPlaying={isPlaying}
          isEmbed={isEmbed}
          selectedGenre={selectedGenre}
          volume={volume}
          isMuted={isMuted}
          showVolume={showVolume}
          setShowVolume={setShowVolume}
          miniSlotRef={miniSlotRef}
          handleRestore={handleRestore}
          handleClose={handleClose}
          handleTogglePlay={handleTogglePlay}
          handlePrevStation={handlePrevStation}
          handleNextStation={handleNextStation}
          handleShuffle={handleShuffle}
          handleVolumeChange={handleVolumeChange}
          getVolumeIcon={getVolumeIcon}
        />
      )}

      {/* ── Full Player ────────────────────────────────────────────── */}
      {isOpen && (
        <MusicPlayerFull
          isPlaying={isPlaying}
          isEmbed={isEmbed}
          isMuted={isMuted}
          volume={volume}
          showVolume={showVolume}
          setShowVolume={setShowVolume}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          currentStation={currentStation}
          playerType={playerType}
          customUrl={customUrl}
          setCustomUrl={setCustomUrl}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          showChat={showChat}
          setShowChat={setShowChat}
          fullSlotRef={fullSlotRef}
          handleMinimize={handleMinimize}
          handleClose={handleClose}
          handleTogglePlay={handleTogglePlay}
          handlePrevStation={handlePrevStation}
          handleNextStation={handleNextStation}
          handleShuffle={handleShuffle}
          handleToggleMute={handleToggleMute}
          handleVolumeChange={handleVolumeChange}
          handlePlayCustom={handlePlayCustom}
          handleSearch={handleSearch}
          handlePlayStation={handlePlayStation}
          playSearchResult={playSearchResult}
          handleShareToPost={handleShareToPost}
          handleOpenStationInTab={handleOpenStationInTab}
          getVolumeIcon={getVolumeIcon}
        />
      )}

      {shareData && (
        <AddPostModal
          onClose={() => setShareData(null)}
          onSubmit={addPost}
          shareType="media"
          shareInitialData={{
            url: shareData.url,
            title: shareData.title,
            artist: shareData.artist,
          }}
        />
      )}
    </>
  );
}
