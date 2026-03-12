import { useState, useEffect } from "react";
import "./NewsFeed.css";

const NewsFeed = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [error, setError] = useState(null);

  const categories = [
    { key: "all", label: "All" },
    { key: "crypto", label: "Crypto" },
    { key: "tech", label: "Tech" },
    { key: "finance", label: "Finance" },
    { key: "business", label: "Business" },
  ];

  // Mock news data - replace with real news API
  const mockNews = [
    {
      id: 1,
      title: "Bitcoin Reaches New All-Time High Above $100k",
      summary:
        "Cryptocurrency market sees massive rally as institutional adoption continues to grow.",
      category: "crypto",
      source: "CryptoNews",
      time: "2 hours ago",
      url: "#",
      image: null,
    },
    {
      id: 2,
      title: "Apple Announces Revolutionary AI Chip Architecture",
      summary:
        "New M4 Pro chip promises 40% better performance for AI workloads and machine learning.",
      category: "tech",
      source: "TechCrunch",
      time: "4 hours ago",
      url: "#",
      image: null,
    },
    {
      id: 3,
      title: "Federal Reserve Hints at Interest Rate Cuts",
      summary:
        "Chairman Powell suggests monetary policy may shift in response to inflation trends.",
      category: "finance",
      source: "Financial Times",
      time: "6 hours ago",
      url: "#",
      image: null,
    },
    {
      id: 4,
      title: "Ethereum 2.0 Staking Rewards Hit Record High",
      summary:
        "Network upgrade brings improved scalability and higher returns for validators.",
      category: "crypto",
      source: "CoinDesk",
      time: "8 hours ago",
      url: "#",
      image: null,
    },
    {
      id: 5,
      title: "Tesla Expands Supercharger Network to 50,000 Stations",
      summary:
        "Electric vehicle charging infrastructure reaches milestone as adoption accelerates.",
      category: "business",
      source: "Reuters",
      time: "10 hours ago",
      url: "#",
      image: null,
    },
    {
      id: 6,
      title: "Meta Launches New VR Headset with Brain-Computer Interface",
      summary:
        "Revolutionary technology allows direct neural control of virtual environments.",
      category: "tech",
      source: "The Verge",
      time: "12 hours ago",
      url: "#",
      image: null,
    },
  ];

  const fetchNews = async (category = "all") => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let filteredNews = mockNews;
      if (category !== "all") {
        filteredNews = mockNews.filter((item) => item.category === category);
      }

      setNews(filteredNews);
      setError(null);
    } catch (_err) {
      setError("Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const getCategoryIcon = (category) => {
    const icons = {
      all: "📰",
      crypto: "₿",
      tech: "💻",
      finance: "📈",
      business: "🏢",
    };
    return icons[category] || "📰";
  };

  const truncateText = (text, maxLength = 100) => {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (loading) {
    return (
      <div className="news-feed">
        <div className="news-header">
          <h3>Latest News</h3>
        </div>
        <div className="news-loading">Loading news...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-feed">
        <div className="news-header">
          <h3>Latest News</h3>
        </div>
        <div className="news-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="news-feed">
      <div className="news-header">
        <h3>Latest News</h3>
        <button
          className="refresh-btn"
          onClick={() => fetchNews(selectedCategory)}
        >
          🔄
        </button>
      </div>

      <div className="news-categories">
        {categories.map((category) => (
          <button
            key={category.key}
            className={`category-btn ${selectedCategory === category.key ? "active" : ""}`}
            onClick={() => setSelectedCategory(category.key)}
          >
            <span className="category-icon">
              {getCategoryIcon(category.key)}
            </span>
            <span className="category-label">{category.label}</span>
          </button>
        ))}
      </div>

      <div className="news-list">
        {news.map((article) => (
          <div key={article.id} className="news-item">
            <div className="news-content">
              <div className="news-meta">
                <span className="news-source">{article.source}</span>
                <span className="news-time">{article.time}</span>
              </div>

              <h4 className="news-title">{article.title}</h4>
              <p className="news-summary">{truncateText(article.summary)}</p>

              <div className="news-footer">
                <span className="news-category">
                  {getCategoryIcon(article.category)} {article.category}
                </span>
                <button className="read-more-btn">Read More</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {news.length === 0 && (
        <div className="no-news">
          No news available for the selected category.
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
