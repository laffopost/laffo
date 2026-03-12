import { lazy, Suspense } from "react";
import "./Dashboard.css";

// Lazy-load all dashboard widgets — each one may fetch external APIs
// and none are needed for the initial paint
const WeatherWidget = lazy(() =>
  import("../components/features/weather").then((m) => ({
    default: m.WeatherWidget,
  })),
);
const NewsFeed = lazy(() =>
  import("../components/features/feeds").then((m) => ({
    default: m.NewsFeed,
  })),
);
const StockTracker = lazy(() =>
  import("../components/features/trading").then((m) => ({
    default: m.StockTracker,
  })),
);
const SportsResults = lazy(() =>
  import("../components/features/utilities").then((m) => ({
    default: m.SportsResults,
  })),
);
const TokenInfo = lazy(() =>
  import("../components/features/trading").then((m) => ({
    default: m.TokenInfo,
  })),
);
const CommunityStats = lazy(() =>
  import("../components/features/stats").then((m) => ({
    default: m.CommunityStats,
  })),
);

const WidgetFallback = () => (
  <div
    style={{ minHeight: 80, background: "rgba(255,255,255,0.03)", borderRadius: 12 }}
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

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Your personalized finance and information hub</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-row">
          <div className="dashboard-card">
            <Suspense fallback={<WidgetFallback />}>
              <WeatherWidget />
            </Suspense>
          </div>
          <div className="dashboard-card">
            <Suspense fallback={<WidgetFallback />}>
              <TokenInfo data={TOKEN_DATA} />
            </Suspense>
          </div>
          <div className="dashboard-card">
            <Suspense fallback={<WidgetFallback />}>
              <CommunityStats />
            </Suspense>
          </div>
        </div>

        <div className="dashboard-row">
          <div className="dashboard-card wide">
            <Suspense fallback={<WidgetFallback />}>
              <StockTracker />
            </Suspense>
          </div>
          <div className="dashboard-card">
            <Suspense fallback={<WidgetFallback />}>
              <SportsResults />
            </Suspense>
          </div>
        </div>

        <div className="dashboard-row">
          <div className="dashboard-card extra-wide">
            <Suspense fallback={<WidgetFallback />}>
              <NewsFeed />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
