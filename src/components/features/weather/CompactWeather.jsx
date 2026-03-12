import { useState, useEffect } from "react";
import "./CompactWeather.css";

const CompactWeather = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Get user's location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Coordinates available from position.coords if needed
          fetchWeatherByCoords();
        },
        (error) => {
          console.warn("Geolocation error:", error);
          // Fallback to default location
          fetchWeatherByCity("New York");
        },
      );
    } else {
      fetchWeatherByCity("New York");
    }
  };

  const fetchWeatherByCity = async (city) => {
    setLoading(true);
    try {
      // For demo - replace with real OpenWeatherMap API
      // const API_KEY = 'your_openweather_api_key';
      // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);

      // Mock data for now
      const mockWeatherData = {
        "New York": {
          temp: 22,
          condition: "Sunny",
          icon: "☀️",
          city: "New York",
        },
        London: { temp: 15, condition: "Cloudy", icon: "☁️", city: "London" },
        Tokyo: {
          temp: 28,
          condition: "Partly Cloudy",
          icon: "⛅",
          city: "Tokyo",
        },
        Paris: { temp: 18, condition: "Light Rain", icon: "🌧️", city: "Paris" },
        Sydney: { temp: 25, condition: "Clear", icon: "☀️", city: "Sydney" },
        Berlin: { temp: 12, condition: "Overcast", icon: "☁️", city: "Berlin" },
        Mumbai: { temp: 32, condition: "Hot", icon: "🌡️", city: "Mumbai" },
        Moscow: { temp: -5, condition: "Snow", icon: "❄️", city: "Moscow" },
      };

      await new Promise((resolve) => setTimeout(resolve, 500));

      const data = mockWeatherData[city] || mockWeatherData["New York"];
      setWeather(data);
      setError(null);
    } catch (_err) {
      setError("Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = async () => {
    setLoading(true);
    try {
      // For demo - replace with real API
      // const API_KEY = 'your_openweather_api_key';
      // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);

      // Mock data based on coordinates
      await new Promise((resolve) => setTimeout(resolve, 500));
      setWeather({
        temp: 20,
        condition: "Clear",
        icon: "☀️",
        city: "Your Location",
      });
      setError(null);
    } catch (_err) {
      setError("Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchWeatherByCity(searchQuery.trim());
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  useEffect(() => {
    getUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="compact-weather">
        <div className="weather-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="compact-weather">
        <div className="weather-error">Weather unavailable</div>
      </div>
    );
  }

  return (
    <div className="compact-weather">
      <div className="weather-main" onClick={() => setShowSearch(!showSearch)}>
        <div className="weather-icon">{weather.icon}</div>
        <div className="weather-info">
          <div className="location">{weather.city}</div>
          <div className="temperature-condition">
            <span className="temperature">{weather.temp}°C</span>
            <span className="condition-small">{weather.condition}</span>
          </div>
        </div>
        <div className="search-toggle">🔍</div>
      </div>

      {showSearch && (
        <div className="weather-search-section">
          <form onSubmit={handleSearch} className="weather-search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city..."
              className="search-input"
              autoFocus
            />
            <button type="submit" className="search-btn">
              Go
            </button>
          </form>

          <div className="popular-cities">
            <div className="popular-cities-label">Popular Cities:</div>
            <div className="city-buttons">
              {[
                "New York",
                "London",
                "Tokyo",
                "Paris",
                "Sydney",
                "Berlin",
                "Mumbai",
                "Los Angeles",
              ].map((city) => (
                <button
                  key={city}
                  className="city-btn"
                  onClick={() => {
                    fetchWeatherByCity(city);
                    setShowSearch(false);
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactWeather;
