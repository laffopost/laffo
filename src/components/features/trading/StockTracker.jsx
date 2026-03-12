import { useState, useEffect } from "react";
import "./StockTracker.css";

const StockTracker = () => {
  const [stocks, setStocks] = useState([]);
  const [watchlist] = useState(["AAPL", "GOOGL", "TSLA", "MSFT", "NVDA"]);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState(null);
  const [error, setError] = useState(null);

  // Mock stock data - replace with real stock API
  const mockStockData = {
    AAPL: {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 185.2,
      change: 2.45,
      changePercent: 1.34,
      volume: 45678901,
      marketCap: "2.89T",
      high: 187.5,
      low: 183.1,
      open: 184.0,
    },
    GOOGL: {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      price: 142.8,
      change: -1.2,
      changePercent: -0.83,
      volume: 25789012,
      marketCap: "1.81T",
      high: 144.2,
      low: 141.9,
      open: 143.5,
    },
    TSLA: {
      symbol: "TSLA",
      name: "Tesla Inc.",
      price: 248.75,
      change: 8.3,
      changePercent: 3.45,
      volume: 89012345,
      marketCap: "791B",
      high: 250.0,
      low: 242.1,
      open: 245.2,
    },
    MSFT: {
      symbol: "MSFT",
      name: "Microsoft Corp.",
      price: 378.9,
      change: -2.1,
      changePercent: -0.55,
      volume: 34567890,
      marketCap: "2.81T",
      high: 381.2,
      low: 376.5,
      open: 380.1,
    },
    NVDA: {
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      price: 875.4,
      change: 15.6,
      changePercent: 1.81,
      volume: 67890123,
      marketCap: "2.16T",
      high: 880.0,
      low: 865.2,
      open: 870.3,
    },
  };

  const fetchStockData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const stockData = watchlist.map((symbol) => mockStockData[symbol]);
      setStocks(stockData);
      setError(null);
    } catch (_err) {
      setError("Failed to fetch stock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();

    // Simulate real-time updates
    const interval = setInterval(() => {
      setStocks((prevStocks) =>
        prevStocks.map((stock) => ({
          ...stock,
          price: stock.price + (Math.random() - 0.5) * 2,
          change: stock.change + (Math.random() - 0.5) * 0.5,
          changePercent: stock.changePercent + (Math.random() - 0.5) * 0.2,
        })),
      );
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist]);

  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getChangeColor = (change) => {
    return change >= 0 ? "#00ff88" : "#ff4757";
  };

  const getChangeIcon = (change) => {
    return change >= 0 ? "📈" : "📉";
  };

  if (loading) {
    return (
      <div className="stock-tracker">
        <div className="stock-header">
          <h3>Stock Market</h3>
        </div>
        <div className="stock-loading">Loading stocks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-tracker">
        <div className="stock-header">
          <h3>Stock Market</h3>
        </div>
        <div className="stock-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="stock-tracker">
      <div className="stock-header">
        <h3>Stock Market</h3>
        <button className="refresh-btn" onClick={fetchStockData}>
          🔄
        </button>
      </div>

      <div className="market-summary">
        <div className="market-stat">
          <span className="stat-label">Market Status</span>
          <span className="stat-value market-open">🟢 Open</span>
        </div>
        <div className="market-stat">
          <span className="stat-label">Active Stocks</span>
          <span className="stat-value">{stocks.length}</span>
        </div>
      </div>

      <div className="stock-list">
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            className={`stock-item ${selectedStock === stock.symbol ? "selected" : ""}`}
            onClick={() =>
              setSelectedStock(
                selectedStock === stock.symbol ? null : stock.symbol,
              )
            }
          >
            <div className="stock-main">
              <div className="stock-info">
                <div className="stock-symbol">{stock.symbol}</div>
                <div className="stock-name">{stock.name}</div>
              </div>

              <div className="stock-price">
                <div className="price">{formatPrice(stock.price)}</div>
                <div
                  className="change"
                  style={{ color: getChangeColor(stock.change) }}
                >
                  {getChangeIcon(stock.change)} {stock.change >= 0 ? "+" : ""}
                  {formatPrice(stock.change)} (
                  {stock.changePercent >= 0 ? "+" : ""}
                  {stock.changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>

            {selectedStock === stock.symbol && (
              <div className="stock-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Open</span>
                    <span className="detail-value">
                      {formatPrice(stock.open)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">High</span>
                    <span className="detail-value">
                      {formatPrice(stock.high)}
                    </span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Low</span>
                    <span className="detail-value">
                      {formatPrice(stock.low)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Volume</span>
                    <span className="detail-value">
                      {formatNumber(stock.volume)}
                    </span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item full-width">
                    <span className="detail-label">Market Cap</span>
                    <span className="detail-value">{stock.marketCap}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="stock-footer">
        <span className="last-updated">Last updated: Just now</span>
        <span className="data-disclaimer">*Delayed 15 minutes</span>
      </div>
    </div>
  );
};

export default StockTracker;
