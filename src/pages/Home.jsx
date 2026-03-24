import { lazy, Suspense } from "react";
import PostGallery from "../components/post/PostGallery";
import { JokeOfTheDay } from "../components/features/jokes";
import "./Home.css";
import logger from "../utils/logger";

// Lazy-load heavy sidebar widgets — they are below-the-fold on first paint
// and have their own API calls / Firebase subscriptions
const TokenInfo = lazy(() =>
  import("../components/features/trading").then((m) => ({
    default: m.TokenInfo,
  })),
);
const FirebaseChat = lazy(() =>
  import("../components/features/chat").then((m) => ({
    default: m.FirebaseChat,
  })),
);
const CommunityStats = lazy(() =>
  import("../components/features/stats").then((m) => ({
    default: m.CommunityStats,
  })),
);
const LiveFeed = lazy(() =>
  import("../components/features/feeds").then((m) => ({
    default: m.LiveFeed,
  })),
);
const CompactWeather = lazy(() =>
  import("../components/features/weather").then((m) => ({
    default: m.CompactWeather,
  })),
);

// Minimal fallback — avoids layout shift
const WidgetFallback = () => (
  <div
    style={{ minHeight: 60, background: "rgba(255,255,255,0.03)", borderRadius: 12 }}
    aria-hidden="true"
  />
);

// Static token data — replace with live fetch when available
const TOKEN_DATA = {
  price: 0.01569,
  change: 15.43,
  volume: 2567891,
  marketCap: 15689234,
  holders: 8234,
};

export default function Home() {
  logger.log("Home rendered");

  return (
    <div className="home">
      <div className="home-layout">
        <div className="left-column">
          <JokeOfTheDay />
        </div>
        <div className="center-column">
          <PostGallery />
        </div>
        <div className="right-column">
          <div className="chat-wrapper">
            <Suspense fallback={<WidgetFallback />}>
              <CommunityStats />
            </Suspense>
            <Suspense fallback={<WidgetFallback />}>
              <LiveFeed />
            </Suspense>
            <Suspense fallback={<WidgetFallback />}>
              <FirebaseChat />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
