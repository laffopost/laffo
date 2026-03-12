import { useState } from "react";
import { WeatherWidget } from "../components/features/weather";
import { NewsFeed } from "../components/features/feeds";
import { StockTracker } from "../components/features/trading";
import { SportsResults } from "../components/features/utilities";
import { TokenInfo } from "../components/features/trading";
import { CommunityStats } from "../components/features/stats";
import "./Dashboard.css";

export default function Dashboard() {
  const [tokenData] = useState({
    price: 0.01569,
    change: 15.43,
    volume: 2567891,
    marketCap: 15689234,
    holders: 8234,
  });

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Your personalized finance and information hub</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-row">
          <div className="dashboard-card">
            <WeatherWidget />
          </div>
          <div className="dashboard-card">
            <TokenInfo data={tokenData} />
          </div>
          <div className="dashboard-card">
            <CommunityStats />
          </div>
        </div>

        <div className="dashboard-row">
          <div className="dashboard-card wide">
            <StockTracker />
          </div>
          <div className="dashboard-card">
            <SportsResults />
          </div>
        </div>

        <div className="dashboard-row">
          <div className="dashboard-card extra-wide">
            <NewsFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
