import { useState } from "react";
import PostGallery from "../components/post/PostGallery";
import { TokenInfo } from "../components/features/trading";
import { FirebaseChat } from "../components/features/chat";
import { MoodTracker } from "../components/features/utilities";
import { CommunityStats } from "../components/features/stats";
import { MusicPlayer } from "../components/features/music";
import { LiveFeed } from "../components/features/feeds";
import { CompactWeather } from "../components/features/weather";

import "./Home.css";

import logger from "../utils/logger";
export default function Home() {
  logger.log("Home rendered");
  const [tokenData] = useState({
    price: 0.01569,
    change: 15.43,
    volume: 2567891,
    marketCap: 15689234,
    holders: 8234,
  });

  return (
    <div className="home">
      <MusicPlayer />
      <div className="home-layout">
        <div className="left-column">
          <MoodTracker />
          <CompactWeather />
          <TokenInfo data={tokenData} />
        </div>
        <div className="center-column">
          <PostGallery />
        </div>
        <div className="right-column">
          <div className="chat-wrapper">
            <CommunityStats />
            <LiveFeed />
            <FirebaseChat />
          </div>
        </div>
      </div>
    </div>
  );
}
