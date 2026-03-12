import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import { EmojiPicker } from "../utilities";
import "./MusicPlayer.css";

const GENRES = [
  "Search",
  "Lofi",
  "EDM",
  "Rock",
  "Jazz",
  "Classical",
  "Hip Hop",
  "Radio",
  "Pop",
  "R&B",
  "Country",
  "Metal",
  "Ambient",
];

const GENRE_ICONS = {
  Search: "🔍",
  Lofi: "🌙",
  EDM: "⚡",
  Rock: "🎸",
  Jazz: "🎷",
  Classical: "🎻",
  "Hip Hop": "🎤",
  Radio: "📻",
  Pop: "🎶",
  "R&B": "💜",
  Country: "🤠",
  Metal: "🤘",
  Ambient: "🌊",
};

const STATIONS = {
  Lofi: [
    {
      name: "Lofi Girl",
      url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      type: "youtube",
    },
    {
      name: "Chillhop Radio",
      url: "https://www.youtube.com/watch?v=5yx6BWlEVcY",
      type: "youtube",
    },
    {
      name: "ChillHop Stream",
      url: "https://streams.ilovemusic.de/iloveradio17.mp3",
      type: "audio",
    },
  ],
  EDM: [
    {
      name: "Bass Boosted",
      url: "https://www.youtube.com/watch?v=TgKbpooHZmE",
      type: "youtube",
    },
    {
      name: "EDM Radio",
      url: "https://streams.ilovemusic.de/iloveradio2.mp3",
      type: "audio",
    },
  ],
  Rock: [
    {
      name: "Classic Rock",
      url: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
      type: "youtube",
    },
    {
      name: "Rock Hits",
      url: "https://stream.rockantenne.de/rockantenne/stream/mp3",
      type: "audio",
    },
  ],
  Jazz: [
    {
      name: "Smooth Jazz YT",
      url: "https://www.youtube.com/watch?v=neV3EPgvZ3g",
      type: "youtube",
    },
    {
      name: "Jazz Radio",
      url: "https://jazz-wr01.ice.infomaniak.ch/jazz-wr01-128.mp3",
      type: "audio",
    },
  ],
  Classical: [
    {
      name: "Classical Piano",
      url: "https://www.youtube.com/watch?v=EhO_MrRfftU",
      type: "youtube",
    },
    {
      name: "Classical Radio",
      url: "https://stream.srg-ssr.ch/m/rsj/mp3_128",
      type: "audio",
    },
  ],
  "Hip Hop": [
    {
      name: "90s Hip Hop",
      url: "https://www.youtube.com/watch?v=V6ZlH0jJdQk",
      type: "youtube",
    },
    {
      name: "Hip Hop Beats",
      url: "https://streams.ilovemusic.de/iloveradio6.mp3",
      type: "audio",
    },
  ],
  Radio: [
    {
      name: "Hot Mix Radio",
      url: "https://streams.ilovemusic.de/iloveradio1.mp3",
      type: "audio",
    },
    {
      name: "Dance Radio",
      url: "https://streams.ilovemusic.de/iloveradio13.mp3",
      type: "audio",
    },
    {
      name: "Party Radio",
      url: "https://streams.ilovemusic.de/iloveradio8.mp3",
      type: "audio",
    },
  ],
  Pop: [
    {
      name: "Pop Hits",
      url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      type: "youtube",
    },
    {
      name: "Pop Radio",
      url: "https://streams.ilovemusic.de/iloveradio3.mp3",
      type: "audio",
    },
  ],
  "R&B": [
    {
      name: "R&B Vibes",
      url: "https://www.youtube.com/watch?v=C_r5UJrxcck",
      type: "youtube",
    },
    {
      name: "R&B Radio",
      url: "https://streams.ilovemusic.de/iloveradio5.mp3",
      type: "audio",
    },
  ],
  Country: [
    {
      name: "Country Hits",
      url: "https://www.youtube.com/watch?v=qkk2tQMWNYs",
      type: "youtube",
    },
    {
      name: "Country Radio",
      url: "https://streams.ilovemusic.de/iloveradio9.mp3",
      type: "audio",
    },
  ],
  Metal: [
    {
      name: "Metal Classics",
      url: "https://www.youtube.com/watch?v=tYzGQOT-tYo",
      type: "youtube",
    },
    {
      name: "Metal Radio",
      url: "https://streams.ilovemusic.de/iloveradio11.mp3",
      type: "audio",
    },
  ],
  Ambient: [
    {
      name: "Ambient Sounds",
      url: "https://www.youtube.com/watch?v=SwaVOzT1d0A",
      type: "youtube",
    },
    {
      name: "Ambient Radio",
      url: "https://streams.ilovemusic.de/iloveradio18.mp3",
      type: "audio",
    },
  ],
};

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
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  // Music search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Music chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatScrollRef = useRef(null); // Desktop chat scroll
  const mobileScrollRef = useRef(null); // Mobile chat scroll
  const chatCooldownRef = useRef(0);
  const { firebaseUser, userProfile } = useAuth();

  // Debug showChat state changes
  useEffect(() => {
    console.log("🎵 [MusicChat] showChat state changed:", showChat);
  }, [showChat]);

  // Debug showChat state changes
  useEffect(() => {
    console.log("🎵 [MusicChat] showChat state changed:", showChat);
  }, [showChat]);

  const audioRef = useRef(null);
  const iframeRef = useRef(null);
  const genreCarouselRef = useRef(null);
  const prevVolumeRef = useRef(80);

  // Chat user info
  const chatUser = useMemo(() => {
    console.log("🎵 [MusicChat] Setting up chat user:", {
      firebaseUser: !!firebaseUser,
      userProfile: !!userProfile,
      uid: firebaseUser?.uid,
      username: userProfile?.username,
      displayName: firebaseUser?.displayName,
    });

    if (!firebaseUser) {
      console.log("🎵 [MusicChat] No firebase user, chat disabled");
      return null;
    }

    const user = {
      uid: firebaseUser.uid,
      name: userProfile?.username || firebaseUser.displayName || "Anon",
    };

    console.log("🎵 [MusicChat] Chat user created:", user);
    return user;
  }, [firebaseUser, userProfile]);

  // Subscribe to chat-messages (same collection as main chat)
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  useEffect(() => {
    console.log("🎵 [MusicChat] Setting up Firestore subscription:", {
      chatUser: !!chatUser,
      chatUserUid: chatUser?.uid,
    });

    // Start subscription as soon as we have a user, regardless of showChat
    if (!chatUser) {
      console.log(
        "🎵 [MusicChat] Skipping subscription - no chatUser:",
        !!chatUser,
      );
      setSubscriptionActive(false);
      return;
    }

    console.log(
      "🎵 [MusicChat] Creating Firestore query for music-chat collection",
    );
    setSubscriptionActive(true);
    const q = query(
      collection(db, "music-chat"),
      orderBy("timestamp", "desc"),
      limit(50),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        console.log("🎵 [MusicChat] Firestore snapshot received:", {
          size: snap.size,
          empty: snap.empty,
          hasPendingWrites: snap.metadata.hasPendingWrites,
        });

        const msgs = [];
        snap.forEach((doc) => {
          const data = doc.data();
          console.log("🎵 [MusicChat] Processing message:", {
            id: doc.id,
            text: data.text,
            userName: data.userName,
            userId: data.userId,
            timestamp: data.timestamp,
          });
          msgs.push({ id: doc.id, ...data });
        });

        const reversedMsgs = msgs.reverse();
        console.log("🎵 [MusicChat] Setting chat messages:", {
          count: reversedMsgs.length,
          messages: reversedMsgs.map((m) => ({
            id: m.id,
            text: m.text,
            userName: m.userName,
          })),
        });
        setChatMessages(reversedMsgs);
      },
      (error) => {
        console.error("🎵 [MusicChat] Firestore subscription error:", error);
        toast.error("Failed to load music chat");
      },
    );

    return () => {
      console.log("🎵 [MusicChat] Cleaning up Firestore subscription");
      setSubscriptionActive(false);
      unsub();
    };
  }, [chatUser]); // Only depend on chatUser, not showChat

  // Monitor chatMessages state changes
  useEffect(() => {
    console.log("🎵 [MusicChat] ChatMessages state changed:", {
      count: chatMessages.length,
      messages: chatMessages.map((m) => ({
        id: m.id,
        text: m.text?.substring(0, 50) + (m.text?.length > 50 ? "..." : ""),
        userName: m.userName,
        userId: m.userId,
        timestamp: m.timestamp ? "has timestamp" : "no timestamp",
      })),
    });
  }, [chatMessages]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatMessages.length > 0) {
      const scrollToBottom = (ref) => {
        if (ref.current) {
          const t = setTimeout(() => {
            ref.current.scrollTop = ref.current.scrollHeight;
          }, 80);
          return t;
        }
        return null;
      };

      const timeouts = [];
      if (chatScrollRef.current) timeouts.push(scrollToBottom(chatScrollRef));
      if (mobileScrollRef.current)
        timeouts.push(scrollToBottom(mobileScrollRef));

      return () => timeouts.forEach((t) => t && clearTimeout(t));
    }
  }, [chatMessages]);

  const handleSendChatMessage = useCallback(
    async (e) => {
      e.preventDefault();

      console.log("🎵 [MusicChat] Send message attempt:", {
        chatInput: chatInput.trim(),
        chatUser: !!chatUser,
        chatUserUid: chatUser?.uid,
        chatUserName: chatUser?.name,
      });

      if (!chatInput.trim() || !chatUser) {
        console.log(
          "🎵 [MusicChat] Send message blocked - empty input or no user",
        );
        return;
      }

      const now = Date.now();
      if (now - chatCooldownRef.current < 2000) {
        console.log("🎵 [MusicChat] Send message blocked - cooldown active");
        toast.error("Slow down! Wait a moment.");
        return;
      }

      chatCooldownRef.current = now;

      const messageData = {
        text: chatInput.trim().slice(0, 200),
        userId: chatUser.uid,
        userName: chatUser.name,
        timestamp: serverTimestamp(),
      };

      console.log("🎵 [MusicChat] Sending message to Firestore:", messageData);

      try {
        const docRef = await addDoc(collection(db, "music-chat"), messageData);
        console.log("🎵 [MusicChat] Message sent successfully:", {
          docId: docRef.id,
          messageData,
        });
        setChatInput("");
        toast.success("Message sent!");
      } catch (error) {
        console.error("🎵 [MusicChat] Failed to send message:", error);
        toast.error("Failed to send message: " + error.message);
      }
    },
    [chatInput, chatUser],
  );

  const formatChatTime = useCallback((ts) => {
    if (!ts) return "";
    return ts.toDate().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji) => {
    setChatInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  // YouTube Search using YouTube Data API v3
  const searchYouTubeMusic = useCallback(async (query) => {
    if (!query.trim()) return [];

    setIsSearching(true);
    try {
      // You'll need to get a YouTube Data API key from Google Cloud Console
      // https://console.cloud.google.com/apis/credentials
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

      // Get video details (duration) for the found videos
      const videoIds = data.items.map((item) => item.id.videoId).join(",");
      const detailsUrl =
        `https://www.googleapis.com/youtube/v3/videos?` +
        `key=${API_KEY}&` +
        `part=contentDetails,statistics&` +
        `id=${videoIds}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      // Format duration from ISO 8601 to readable format
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

      // Combine search results with video details
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

  // Handle search
  const handleSearch = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!searchQuery.trim()) return;

      console.log("🎵 [Search] Searching for:", searchQuery);
      const results = await searchYouTubeMusic(searchQuery);
      setSearchResults(results);
      setSelectedGenre("Search"); // Auto-select Search tab
      toast.success(`Found ${results.length} songs!`);
    },
    [searchQuery, searchYouTubeMusic],
  );

  // Play search result
  const playSearchResult = useCallback((result) => {
    const youtubeUrl = `https://www.youtube.com/embed/${result.youtubeId}?autoplay=1&mute=0`;

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
    setSelectedGenre("Search"); // Set to search mode

    toast.success(`Now playing: ${result.title}`);
  }, []);

  const getEmbedUrl = (url) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      )?.[1];
      return videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`
        : null;
    }
    if (url.includes("spotify.com")) {
      const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1];
      const playlistId = url.match(/playlist\/([a-zA-Z0-9]+)/)?.[1];
      if (trackId)
        return `https://open.spotify.com/embed/track/${trackId}?autoplay=1`;
      if (playlistId)
        return `https://open.spotify.com/embed/playlist/${playlistId}?autoplay=1`;
    }
    return null;
  };

  const getSourceBadge = (type) => {
    switch (type) {
      case "youtube":
        return { icon: "📺", label: "YouTube", color: "#FF0000" };
      case "audio":
        return { icon: "📻", label: "Radio", color: "#10b981" };
      default:
        return { icon: "🎵", label: "Stream", color: "#8b5cf6" };
    }
  };

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
        setIsPlaying((p) => !p);
      }
    },
    [playerType, isPlaying],
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

  const scrollGenres = (dir) => {
    genreCarouselRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  const handleOpenStationInTab = (e, station) => {
    e.stopPropagation();
    window.open(
      station.originalUrl || station.url,
      "_blank",
      "noopener,noreferrer",
    );
  };

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
    setIsOpen(false);
    setIsMinimized(false);
    setHasAutoPlayed(false);
    setShowVolume(false);
  };

  // Auto-play first station when player opens
  useEffect(() => {
    if (isOpen && !hasAutoPlayed && !currentStation) {
      const first = STATIONS[selectedGenre]?.[0];
      if (first) {
        handlePlayStation(first);
        setHasAutoPlayed(true);
      }
    }
  }, [isOpen, hasAutoPlayed, currentStation, selectedGenre, handlePlayStation]);

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

  const volIcon =
    isMuted || volume === 0
      ? "🔇"
      : volume < 40
        ? "🔈"
        : volume < 70
          ? "🔉"
          : "🔊";

  /* ── Minimized ──────────────────────────────────────────────────────── */
  if (isMinimized) {
    return (
      <>
        {/* Keep audio element alive so radio continues playing */}
        <audio ref={audioRef} preload="none" crossOrigin="anonymous" />
        <div className="music-minimized">
          {/* ── Top bar: title + maximize / close ── */}
          <div className="mini-header">
            <div className="mini-header-info" onClick={handleRestore}>
              <span
                className={`mini-header-icon ${isPlaying ? "playing" : ""}`}
              >
                {isPlaying ? "🎵" : "⏸️"}
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
              >
                ⤢
              </button>
              <button
                className="mini-hdr-btn close"
                onClick={handleClose}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Media display: YouTube iframe OR audio visualizer ── */}
          <div className="mini-media" onClick={handleRestore}>
            {playerType === "embed" && currentStation ? (
              <iframe
                src={isPlaying ? currentStation.url : undefined}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                title="mini-player"
                className="mini-media-iframe"
              />
            ) : (
              <div className="mini-visualizer-area">
                <div className="mini-visualizer">
                  {isPlaying ? (
                    [...Array(9)].map((_, i) => (
                      <div key={i} className="mini-vis-bar" />
                    ))
                  ) : (
                    <div className="mini-vis-paused">🎧</div>
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

          {/* ── Bottom transport controls ── */}
          <div className="mini-transport">
            <button
              className="mini-ctrl-btn"
              onClick={handleShuffle}
              title="Shuffle"
            >
              🔀
            </button>
            <button
              className="mini-ctrl-btn"
              onClick={handlePrevStation}
              title="Previous"
            >
              ⏮
            </button>
            <button
              className="mini-ctrl-btn play"
              onClick={handleTogglePlay}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              className="mini-ctrl-btn"
              onClick={handleNextStation}
              title="Next"
            >
              ⏭
            </button>
            <div className="mini-volume-wrap">
              <button
                className="mini-ctrl-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVolume((v) => !v);
                }}
                title="Volume"
              >
                {volIcon}
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
          </div>
        </div>
      </>
    );
  }

  /* ── Closed (FAB) ───────────────────────────────────────────────────── */
  if (!isOpen) {
    return (
      <button
        className="music-open"
        onClick={() => setIsOpen(true)}
        title="Open Music Player"
      >
        <span className="music-open-icon">🎵</span>
        <span className="music-open-pulse" />
      </button>
    );
  }

  /* ── Full Player ────────────────────────────────────────────────────── */
  return (
    <>
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />
      <div className="music-overlay" onClick={handleMinimize}>
        <div className="music-player" onClick={(e) => e.stopPropagation()}>
          <div className="music-header">
            <div className="music-header-left">
              <span className="music-header-icon">🎵</span>
              <h3>Music Player</h3>
            </div>
            <div className="header-btns">
              <button onClick={handleMinimize} title="Minimize">
                <span>–</span>
              </button>
              <button className="close-btn" onClick={handleClose} title="Close">
                <span>✕</span>
              </button>
            </div>
          </div>

          <div className="music-player-layout">
            <div className="music-content">
              {/* Player display */}
              <div className="video-player">
                {playerType === "embed" && currentStation ? (
                  <div className="embed-wrapper">
                    <iframe
                      ref={iframeRef}
                      src={currentStation.url}
                      width="100%"
                      height="260"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      title="player"
                    />
                  </div>
                ) : playerType === "audio" && currentStation ? (
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
                ) : (
                  <div className="video-placeholder">
                    <div className="placeholder-icon">🎧</div>
                    <p>Select a station or paste a URL</p>
                    <span className="placeholder-hint">
                      Music auto-plays when you pick a station
                    </span>
                  </div>
                )}
              </div>

              {/* Transport bar */}
              <div className="transport-bar">
                <div className="transport-left">
                  <button
                    className="transport-btn"
                    onClick={handleShuffle}
                    title="Shuffle"
                  >
                    🔀
                  </button>
                  <button
                    className="transport-btn"
                    onClick={handlePrevStation}
                    title="Previous"
                  >
                    ⏮
                  </button>
                  <button
                    className={`transport-btn play-main ${isPlaying ? "active" : ""}`}
                    onClick={handleTogglePlay}
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                  <button
                    className="transport-btn"
                    onClick={handleNextStation}
                    title="Next"
                  >
                    ⏭
                  </button>
                </div>
                <div className="transport-right">
                  <button
                    className="transport-btn volume-btn"
                    onClick={handleToggleMute}
                    onMouseEnter={() => setShowVolume(true)}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {volIcon}
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
                </div>
              </div>

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
                  <button onClick={handlePlayCustom}>▶ Play</button>
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
                      className={isSearching ? "searching" : ""}
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

              {/* Genre carousel */}
              <div className="genre-carousel-container">
                <div className="genre-carousel-row">
                  <button
                    className="carousel-nav-btn left"
                    onClick={() => scrollGenres("left")}
                    aria-label="Scroll left"
                  >
                    ‹
                  </button>
                  <div className="genre-carousel-wrapper">
                    <div className="genre-carousel" ref={genreCarouselRef}>
                      {GENRES.map((genre) => (
                        <button
                          key={genre}
                          className={`genre-pill ${selectedGenre === genre ? "active" : ""}`}
                          onClick={() => setSelectedGenre(genre)}
                        >
                          <span className="genre-pill-icon">
                            {GENRE_ICONS[genre]}
                          </span>
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    className="carousel-nav-btn right"
                    onClick={() => scrollGenres("right")}
                    aria-label="Scroll right"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Station list */}
              <div className="stations-container">
                {selectedGenre === "Search" ? (
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
                ) : (
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
                )}
              </div>

              {/* Mobile-only Chat Toggle */}
              <div className="music-chat-toggle-bar">
                <button
                  className={`music-chat-toggle-btn ${showChat ? "active" : ""}`}
                  onClick={() => {
                    console.log(
                      "🎵 [MusicChat] Toggling chat visibility:",
                      !showChat,
                    );
                    setShowChat((v) => !v);
                  }}
                >
                  💬 {showChat ? "Hide Chat" : "Music Chat"}
                  {chatMessages.length > 0 && !showChat && (
                    <span className="music-chat-badge">
                      {chatMessages.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Mobile-only Chat Panel (shown when toggled) */}
              {showChat &&
                (() => {
                  console.log("🎵 [MusicChat] Rendering mobile chat panel:", {
                    showChat,
                    messagesCount: chatMessages.length,
                    chatUser: !!chatUser,
                  });
                  return (
                    <div className="music-chat-panel music-chat-mobile-only">
                      <div
                        className="music-chat-messages"
                        ref={mobileScrollRef}
                      >
                        {chatMessages.length === 0 ? (
                          <div className="music-chat-empty">
                            <span>💬</span>
                            <p>Chat while you listen!</p>
                          </div>
                        ) : (
                          chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`music-chat-msg ${msg.userId === chatUser?.uid ? "own" : ""}`}
                            >
                              <div className="music-chat-msg-header">
                                <span className="music-chat-msg-user">
                                  {msg.userName}
                                </span>
                                <span className="music-chat-msg-time">
                                  {formatChatTime(msg.timestamp)}
                                </span>
                              </div>
                              <div className="music-chat-msg-text">
                                {msg.text}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {chatUser ? (
                        <form
                          onSubmit={handleSendChatMessage}
                          className="music-chat-form"
                        >
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Say something..."
                            maxLength={200}
                            className="music-chat-input"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="music-chat-emoji"
                            title="Add emoji"
                          >
                            😊
                          </button>
                          <button type="submit" className="music-chat-send">
                            ➤
                          </button>
                        </form>
                      ) : (
                        <div className="music-chat-login-hint">
                          Log in to chat 💬
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>

            {/* Desktop Right-Side Chat Panel */}
            <div className="music-chat-sidebar">
              <div className="music-chat-sidebar-header">
                <span>💬</span> Music Chat
                <span
                  style={{
                    fontSize: "10px",
                    marginLeft: "8px",
                    padding: "2px 4px",
                    borderRadius: "3px",
                    background: subscriptionActive ? "#90EE90" : "#FFB6C1",
                    color: "#000",
                  }}
                >
                  {subscriptionActive ? "🟢 Live" : "🔴 Offline"}
                </span>
              </div>
              <div className="music-chat-messages" ref={chatScrollRef}>
                {chatMessages.length === 0 ? (
                  <div className="music-chat-empty">
                    <span>💬</span>
                    <p>Chat while you listen!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`music-chat-msg ${msg.userId === chatUser?.uid ? "own" : ""}`}
                    >
                      <div className="music-chat-msg-header">
                        <span className="music-chat-msg-user">
                          {msg.userName}
                        </span>
                        <span className="music-chat-msg-time">
                          {formatChatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div className="music-chat-msg-text">{msg.text}</div>
                    </div>
                  ))
                )}
              </div>
              {chatUser ? (
                <form
                  onSubmit={handleSendChatMessage}
                  className="music-chat-form"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Say something..."
                    maxLength={200}
                    className="music-chat-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="music-chat-emoji"
                    title="Add emoji"
                  >
                    😊
                  </button>
                  <button type="submit" className="music-chat-send">
                    ➤
                  </button>
                </form>
              ) : (
                <div className="music-chat-login-hint">Log in to chat 💬</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </>
  );
}
