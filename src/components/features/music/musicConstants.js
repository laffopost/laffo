export const GENRES = [
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

export const GENRE_ICONS = {
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

export const STATIONS = {
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

export const getEmbedUrl = (url) => {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    )?.[1];
    return videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&enablejsapi=1&origin=${window.location.origin}`
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

export const getSourceBadge = (type) => {
  switch (type) {
    case "youtube":
      return { icon: "📺", label: "YouTube", color: "#FF0000" };
    case "audio":
      return { icon: "📻", label: "Radio", color: "#10b981" };
    default:
      return { icon: "🎵", label: "Stream", color: "#8b5cf6" };
  }
};
