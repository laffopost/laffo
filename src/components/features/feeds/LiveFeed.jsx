import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { usePostData } from "../../../context/PostContext";
import "./LiveFeed.css";

export default function LiveFeed() {
  const [activities, setActivities] = useState([]);
  const feedRef = useRef(null);
  const navigate = useNavigate();
  const { posts } = usePostData();

  // Generate activities from recent posts and game scores
  useEffect(() => {
    const generateActivities = () => {
      const newActivities = [];
      const seenIds = new Set(); // Track seen IDs to avoid duplicates

      // Recent posts activity (limit to 10)
      const recentPosts = posts.slice(0, 10);
      recentPosts.forEach((post) => {
        const activityId = `post-${post.id}`;
        if (!seenIds.has(activityId)) {
          seenIds.add(activityId);
          const label = post.title || post.question || post.status || post.description || null;
          newActivities.push({
            id: activityId,
            type: "post",
            user: post.author || "Anonymous",
            action: post.type === "poll" ? "created a poll" : post.type === "quiz" ? "created a quiz" : post.type === "status" ? "posted a status" : post.type === "countdown" ? "added an event" : post.type === "media" ? "shared media" : "posted",
            title: label,
            timestamp: post.createdAt,
            link: `/image/${post.id}`,
            postType: post.type,
          });
        }
      });

      // Game activities from localStorage (limit to 10)
      const gameScores = JSON.parse(localStorage.getItem("gameScores") || "[]");
      gameScores.slice(0, 10).forEach((score) => {
        const gameNames = {
          reaction: "Reaction Race",
          memory: "Memory Match",
          click: "Click Rush",
        };
        const activityId = `game-${score.id}-${score.timestamp}`;
        if (!seenIds.has(activityId)) {
          seenIds.add(activityId);
          newActivities.push({
            id: activityId,
            type: "game",
            user: score.username,
            action: `won ${gameNames[score.game]}`,
            postType: "game",
            score: score.score,
            timestamp: score.timestamp,
            link: "/games",
          });
        }
      });

      // Sort by timestamp (most recent first)
      newActivities.sort((a, b) => {
        const timeA = a.timestamp?.seconds || a.timestamp || 0;
        const timeB = b.timestamp?.seconds || b.timestamp || 0;
        return timeB - timeA;
      });

      // Limit to maximum 10 items
      setActivities(newActivities.slice(0, 10));
    };

    generateActivities();
    const interval = setInterval(generateActivities, 60000); // Update every 60s (was 30s)

    return () => clearInterval(interval);
  }, [posts]);

  // Auto-scroll to bottom when new activity added
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [activities]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "just now";

    const date = timestamp?.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleUserClick = (e, username) => {
    e.preventDefault();
    e.stopPropagation();
    const profileUsername = username.toLowerCase().replace(/\s+/g, "-");
    navigate(`/profile/${profileUsername}`);
  };

  return (
    <div className="live-feed">
      <div className="live-feed-content" ref={feedRef}>
        {activities.length === 0 ? (
          <div className="feed-empty">
            <p>No recent activity</p>
            <p className="feed-empty-hint">Be the first to post or play! 🎮</p>
          </div>
        ) : (
          <div className="feed-items">
            {activities.map((activity) => (
              <div
                key={`live-feed-${activity.id}`}
                className="feed-item"
                onClick={() => activity.link && navigate(activity.link)}
                style={{ cursor: activity.link ? "pointer" : "default" }}
              >
                <div className="feed-item-content">
                  <div className="feed-item-text">
                    <span
                      className="feed-user"
                      onClick={(e) => handleUserClick(e, activity.user)}
                      title={`View @${activity.user}'s profile`}
                    >
                      @{activity.user}
                    </span>
                    <span className="feed-action">{activity.action}</span>
                    {activity.title && (
                      <span className="feed-title">"{activity.title}"</span>
                    )}
                    {activity.score && (
                      <span className="feed-score">Score: {activity.score}</span>
                    )}
                  </div>
                  <div className="feed-timestamp">
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
                {activity.link && (
                  <ChevronRight size={15} className="feed-chevron" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
