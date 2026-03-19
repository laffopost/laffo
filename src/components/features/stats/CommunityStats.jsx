import { memo } from "react";
import { usePostData } from "../../../context/PostContext";
import "./CommunityStats.css";

const CommunityStats = memo(function CommunityStats() {
  const { totalPosts, totalUsers, totalReacts } = usePostData();

  return (
    <div className="community-stats-card">
      <span className="stat-text-inline">
        POSTS <span className="stat-value-inline">{totalPosts}</span>
      </span>
      <span className="stat-separator">|</span>
      <span className="stat-text-inline">
        USERS <span className="stat-value-inline">{totalUsers}</span>
      </span>
      <span className="stat-separator">|</span>
      <span className="stat-text-inline">
        REACTS <span className="stat-value-inline">{totalReacts}</span>
      </span>
    </div>
  );
});

export default CommunityStats;
