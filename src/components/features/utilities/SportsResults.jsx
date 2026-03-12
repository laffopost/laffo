import { useState, useEffect } from "react";
import "./SportsResults.css";

const SportsResults = () => {
  const [selectedSport, setSelectedSport] = useState("football");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("live"); // live, upcoming, results

  const sports = [
    { key: "football", label: "Football", icon: "⚽" },
    { key: "basketball", label: "Basketball", icon: "🏀" },
    { key: "tennis", label: "Tennis", icon: "🎾" },
    { key: "baseball", label: "Baseball", icon: "⚾" },
  ];

  const viewModes = [
    { key: "live", label: "Live", icon: "🔴" },
    { key: "upcoming", label: "Upcoming", icon: "📅" },
    { key: "results", label: "Results", icon: "✅" },
  ];

  // Mock sports data
  const mockSportsData = {
    football: {
      live: [
        {
          id: 1,
          homeTeam: "Manchester City",
          awayTeam: "Liverpool",
          homeScore: 2,
          awayScore: 1,
          time: "78'",
          status: "live",
          league: "Premier League",
        },
        {
          id: 2,
          homeTeam: "Barcelona",
          awayTeam: "Real Madrid",
          homeScore: 1,
          awayScore: 1,
          time: "45+2'",
          status: "live",
          league: "La Liga",
        },
      ],
      upcoming: [
        {
          id: 3,
          homeTeam: "Chelsea",
          awayTeam: "Arsenal",
          homeScore: null,
          awayScore: null,
          time: "Today 20:00",
          status: "scheduled",
          league: "Premier League",
        },
        {
          id: 4,
          homeTeam: "PSG",
          awayTeam: "Bayern Munich",
          homeScore: null,
          awayScore: null,
          time: "Tomorrow 21:00",
          status: "scheduled",
          league: "Champions League",
        },
      ],
      results: [
        {
          id: 5,
          homeTeam: "Juventus",
          awayTeam: "Inter Milan",
          homeScore: 2,
          awayScore: 3,
          time: "FT",
          status: "finished",
          league: "Serie A",
        },
        {
          id: 6,
          homeTeam: "Atletico Madrid",
          awayTeam: "Valencia",
          homeScore: 1,
          awayScore: 0,
          time: "FT",
          status: "finished",
          league: "La Liga",
        },
      ],
    },
    basketball: {
      live: [
        {
          id: 7,
          homeTeam: "Lakers",
          awayTeam: "Warriors",
          homeScore: 98,
          awayScore: 102,
          time: "Q4 2:45",
          status: "live",
          league: "NBA",
        },
      ],
      upcoming: [
        {
          id: 8,
          homeTeam: "Celtics",
          awayTeam: "Heat",
          homeScore: null,
          awayScore: null,
          time: "Today 22:00",
          status: "scheduled",
          league: "NBA",
        },
      ],
      results: [
        {
          id: 9,
          homeTeam: "Bulls",
          awayTeam: "Knicks",
          homeScore: 115,
          awayScore: 108,
          time: "Final",
          status: "finished",
          league: "NBA",
        },
      ],
    },
  };

  const fetchMatches = async (sport, mode) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const data = mockSportsData[sport] || {
        live: [],
        upcoming: [],
        results: [],
      };
      setMatches(data[mode] || []);
      setError(null);
    } catch (_err) {
      setError("Failed to fetch sports data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(selectedSport, viewMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSport, viewMode]);

  const getStatusColor = (status) => {
    const colors = {
      live: "#ff4757",
      scheduled: "#ffa502",
      finished: "#2ed573",
    };
    return colors[status] || "#b8b8b8";
  };

  const getStatusIcon = (status) => {
    const icons = {
      live: "🔴",
      scheduled: "⏰",
      finished: "✅",
    };
    return icons[status] || "⚽";
  };

  const formatScore = (homeScore, awayScore, status) => {
    if (status === "scheduled") return "vs";
    return `${homeScore} - ${awayScore}`;
  };

  if (loading) {
    return (
      <div className="sports-results">
        <div className="sports-header">
          <h3>Sports</h3>
        </div>
        <div className="sports-loading">Loading sports data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sports-results">
        <div className="sports-header">
          <h3>Sports</h3>
        </div>
        <div className="sports-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="sports-results">
      <div className="sports-header">
        <h3>Sports</h3>
        <button
          className="refresh-btn"
          onClick={() => fetchMatches(selectedSport, viewMode)}
        >
          🔄
        </button>
      </div>

      <div className="sports-tabs">
        {sports.map((sport) => (
          <button
            key={sport.key}
            className={`sport-tab ${selectedSport === sport.key ? "active" : ""}`}
            onClick={() => setSelectedSport(sport.key)}
          >
            <span className="sport-icon">{sport.icon}</span>
            <span className="sport-label">{sport.label}</span>
          </button>
        ))}
      </div>

      <div className="view-modes">
        {viewModes.map((mode) => (
          <button
            key={mode.key}
            className={`view-mode-btn ${viewMode === mode.key ? "active" : ""}`}
            onClick={() => setViewMode(mode.key)}
          >
            <span className="mode-icon">{mode.icon}</span>
            <span className="mode-label">{mode.label}</span>
          </button>
        ))}
      </div>

      <div className="matches-list">
        {matches.map((match) => (
          <div key={match.id} className="match-item">
            <div className="match-header">
              <span className="league-name">{match.league}</span>
              <span
                className="match-status"
                style={{ color: getStatusColor(match.status) }}
              >
                {getStatusIcon(match.status)} {match.time}
              </span>
            </div>

            <div className="match-content">
              <div className="team home-team">
                <span className="team-name">{match.homeTeam}</span>
                {match.status !== "scheduled" && (
                  <span className="team-score">{match.homeScore}</span>
                )}
              </div>

              <div className="match-score">
                {formatScore(match.homeScore, match.awayScore, match.status)}
              </div>

              <div className="team away-team">
                {match.status !== "scheduled" && (
                  <span className="team-score">{match.awayScore}</span>
                )}
                <span className="team-name">{match.awayTeam}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {matches.length === 0 && (
        <div className="no-matches">
          No {viewMode} matches available for{" "}
          {sports.find((s) => s.key === selectedSport)?.label}.
        </div>
      )}
    </div>
  );
};

export default SportsResults;
