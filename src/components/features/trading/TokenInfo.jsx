import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import solanaLogo from "../../../assets/solanaLogo.png";
import { TOKEN_CONTRACT } from "../../../constants/token";
import "./TokenInfo.css";

const DEXSCREENER_API = `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_CONTRACT}`;

// Memoize static data
const topHolders = [
  { address: "CB9d...pump", percentage: "23.5%", amount: "235M" },
  { address: "Ax8n...moon", percentage: "12.8%", amount: "128M" },
  { address: "9Kp2...hodl", percentage: "8.4%", amount: "84M" },
  { address: "Fm3L...degen", percentage: "5.2%", amount: "52M" },
  { address: "7Tn9...whale", percentage: "4.1%", amount: "41M" },
  { address: "3Bg7...ape", percentage: "3.8%", amount: "38M" },
  { address: "8Kx4...moon", percentage: "3.2%", amount: "32M" },
  { address: "5Nq9...chad", percentage: "2.9%", amount: "29M" },
  { address: "2Zv6...king", percentage: "2.6%", amount: "26M" },
  { address: "6Hw1...lord", percentage: "2.3%", amount: "23M" },
];

// Simple static chart - no real-time updates
const SimpleChart = memo(({ change }) => {
  // Generate static chart data once
  const chartPoints = useMemo(() => {
    const points = 8; // Very few points for CPU efficiency
    const data = [];
    let value = 50;

    for (let i = 0; i < points; i++) {
      value += (Math.random() - 0.5) * 10;
      value = Math.max(20, Math.min(80, value)); // Keep in range
      data.push({ x: i, y: value });
    }
    return data;
  }, []); // Only generate once

  const pathData = useMemo(() => {
    const width = 300;
    const height = 60;
    const xStep = width / (chartPoints.length - 1);

    let path = `M 0 ${height}`;
    chartPoints.forEach((point, i) => {
      const x = i * xStep;
      const y = height - point.y;
      path += ` L ${x} ${y}`;
    });
    path += ` L ${width} ${height} Z`;
    return path;
  }, [chartPoints]);

  const linePoints = useMemo(() => {
    const width = 300;
    const height = 60;
    const xStep = width / (chartPoints.length - 1);

    return chartPoints
      .map((point, i) => {
        const x = i * xStep;
        const y = height - point.y;
        return `${x},${y}`;
      })
      .join(" ");
  }, [chartPoints]);

  return (
    <div className="token-chart">
      <svg
        className="chart-svg"
        viewBox="0 0 300 60"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={change >= 0 ? "#10b981" : "#ef4444"}
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor={change >= 0 ? "#10b981" : "#ef4444"}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <path d={pathData} fill="url(#chartGradient)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke={change >= 0 ? "#10b981" : "#ef4444"}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
});

export default function TokenInfo({ data: fallbackData }) {
  const [activeTab, setActiveTab] = useState("info");
  const [liveData, setLiveData] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(TOKEN_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Fetch live data from DexScreener
  const fetchTokenData = useCallback(async () => {
    try {
      const res = await fetch(DEXSCREENER_API);
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      const pair = json.pairs?.[0]; // Use first/most liquid pair
      if (pair) {
        setLiveData({
          price: parseFloat(pair.priceUsd) || fallbackData.price,
          change: parseFloat(pair.priceChange?.h24) || 0,
          volume: parseFloat(pair.volume?.h24) || fallbackData.volume,
          marketCap:
            parseFloat(pair.marketCap || pair.fdv) || fallbackData.marketCap,
          holders: fallbackData.holders, // DexScreener doesn't provide holder count
          liquidity: parseFloat(pair.liquidity?.usd) || 0,
          pairAddress: pair.pairAddress || "",
          dexUrl: pair.url || "",
        });
        setFetchError(false);
        setLastUpdated(new Date());
      }
    } catch {
      setFetchError(true);
    }
  }, [fallbackData]);

  useEffect(() => {
    fetchTokenData();
    const interval = setInterval(fetchTokenData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchTokenData]);

  const data = liveData || fallbackData;
  const isLive = !!liveData && !fetchError;

  const formatNumber = useMemo(
    () => (num) => {
      if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
      return `$${num.toFixed(2)}`;
    },
    [],
  );

  const formatPrice = useMemo(() => (price) => `$${price.toFixed(5)}`, []);

  return (
    <div className="token-info-card">
      {/* Tabs */}
      <div className="token-tabs">
        <button
          className={`tab ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          💰 Token Info
        </button>
        <button
          className={`tab ${activeTab === "holders" ? "active" : ""}`}
          onClick={() => setActiveTab("holders")}
        >
          👑 Top Holders
        </button>
      </div>

      {activeTab === "info" ? (
        <div className="token-content-area">
          {/* Token Header */}
          <div className="token-info-header">
            <div className="token-logo">
              <img src="/laugh.png" alt="LaughCoin" className="token-icon" />
              <div className="token-name">
                <h3>$LAFFO</h3>
                <span className="token-chain">
                  <img
                    src={solanaLogo}
                    alt="Solana"
                    className="solana-logo"
                    style={{
                      height: 10,
                      width: "auto",
                      verticalAlign: "middle",
                      marginRight: 4,
                      marginBottom: 2,
                    }}
                  />
                </span>
              </div>
            </div>
            <span className={`live-badge ${isLive ? "" : "offline"}`}>
              <span className="pulse-dot"></span>
              {isLive ? "Live" : "Static"}
            </span>
          </div>

          {/* Remove Mood Tracker Section - now in separate component */}

          {/* Simple Static Chart */}
          <SimpleChart change={data.change} />

          {/* Price Display */}
          <div className="token-main-stats">
            <span className="token-price">{formatPrice(data.price)}</span>
            <span
              className={`token-change ${
                data.change >= 0 ? "positive" : "negative"
              }`}
            >
              {data.change >= 0 ? "+" : ""}
              {data.change.toFixed(2)}%
            </span>
            <span className="token-volume">
              Vol {formatNumber(data.volume)}
            </span>
          </div>

          {/* Stats */}
          <div className="token-stats-grid">
            <div className="stat-card">
              <span className="stat-label">MC</span>
              <span className="stat-value">{formatNumber(data.marketCap)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">
                {liveData?.liquidity ? "Liquidity" : "Holders"}
              </span>
              <span className="stat-value">
                {liveData?.liquidity
                  ? formatNumber(liveData.liquidity)
                  : data.holders.toLocaleString()}
              </span>
            </div>
          </div>

          {lastUpdated && (
            <div className="token-updated-info">
              Updated {lastUpdated.toLocaleTimeString()}
              {fetchError && " (offline — showing cached data)"}
            </div>
          )}

          {/* Contract */}
          <div className="contract-section">
            <span className="contract-text">
              {TOKEN_CONTRACT.slice(0, 16)}...{TOKEN_CONTRACT.slice(-4)}
            </span>
            <button
              className="copy-btn"
              title="Copy contract address"
              onClick={handleCopy}
            >
              {copied ? "✅" : "📋"}
            </button>
          </div>
        </div>
      ) : (
        <div className="holders-content-area">
          <h3 className="holders-title">Top 10 Holders</h3>

          <div className="top-holders-list">
            {topHolders.map((holder, index) => (
              <div key={holder.address} className="holder-item">
                <div className="holder-rank">#{index + 1}</div>
                <div className="holder-info">
                  <span className="holder-address">{holder.address}</span>
                  <span className="holder-amount">{holder.amount} LAUGH</span>
                </div>
                <div className="holder-percentage">{holder.percentage}</div>
              </div>
            ))}
          </div>

          <div className="holders-summary">
            <div className="summary-stat">
              <span className="stat-label">Top 10 Control</span>
              <span className="stat-value">65.3%</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Distribution</span>
              <span className="stat-value">Good</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
