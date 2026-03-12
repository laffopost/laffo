import { useState, useEffect } from "react";
import "./WeatherWidget.css";

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState("New York");
  const [isEditing, setIsEditing] = useState(false);

  // For demo purposes, using mock data. In production, use OpenWeatherMap API
  const fetchWeather = async (city) => {
    setLoading(true);
    try {
      // Mock weather data - replace with real API
      const mockWeather = {
        "New York": {
          city: "New York",
          temp: 22,
          condition: "Sunny",
          humidity: 65,
          windSpeed: 12,
          forecast: [
            { day: "Today", temp: 22, condition: "sunny" },
            { day: "Tomorrow", temp: 18, condition: "cloudy" },
            { day: "Friday", temp: 25, condition: "sunny" },
            { day: "Saturday", temp: 20, condition: "rainy" },
          ],
        },
        London: {
          city: "London",
          temp: 15,
          condition: "Cloudy",
          humidity: 78,
          windSpeed: 8,
          forecast: [
            { day: "Today", temp: 15, condition: "cloudy" },
            { day: "Tomorrow", temp: 12, condition: "rainy" },
            { day: "Friday", temp: 17, condition: "cloudy" },
            { day: "Saturday", temp: 14, condition: "rainy" },
          ],
        },
        Tokyo: {
          city: "Tokyo",
          temp: 28,
          condition: "Partly Cloudy",
          humidity: 70,
          windSpeed: 15,
          forecast: [
            { day: "Today", temp: 28, condition: "partly-cloudy" },
            { day: "Tomorrow", temp: 30, condition: "sunny" },
            { day: "Friday", temp: 26, condition: "cloudy" },
            { day: "Saturday", temp: 24, condition: "rainy" },
          ],
        },
      };

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay

      const data = mockWeather[city] || mockWeather["New York"];
      setWeather(data);
      setError(null);
    } catch (_err) {
      setError("Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(location);
  }, [location]);

  const getWeatherIcon = (condition) => {
    const icons = {
      sunny: "☀️",
      cloudy: "☁️",
      "partly-cloudy": "⛅",
      rainy: "🌧️",
      stormy: "⛈️",
    };
    return icons[condition.toLowerCase().replace(" ", "-")] || "☀️";
  };

  const handleLocationChange = (newLocation) => {
    setLocation(newLocation);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="weather-widget">
        <div className="weather-header">
          <h3>Weather</h3>
        </div>
        <div className="weather-loading">Loading weather...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget">
        <div className="weather-header">
          <h3>Weather</h3>
        </div>
        <div className="weather-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <h3>Weather</h3>
        <button
          className="location-btn"
          onClick={() => setIsEditing(!isEditing)}
        >
          📍
        </button>
      </div>

      {isEditing && (
        <div className="location-selector">
          {["New York", "London", "Tokyo"].map((city) => (
            <button
              key={city}
              className={`location-option ${location === city ? "active" : ""}`}
              onClick={() => handleLocationChange(city)}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      <div className="current-weather">
        <div className="weather-main">
          <div className="weather-icon">
            {getWeatherIcon(weather.condition)}
          </div>
          <div className="weather-info">
            <div className="temperature">{weather.temp}°C</div>
            <div className="condition">{weather.condition}</div>
            <div className="location-name">{weather.city}</div>
          </div>
        </div>

        <div className="weather-details">
          <div className="detail-item">
            <span className="detail-label">Humidity</span>
            <span className="detail-value">{weather.humidity}%</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Wind</span>
            <span className="detail-value">{weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>

      <div className="weather-forecast">
        <h4>4-Day Forecast</h4>
        <div className="forecast-items">
          {weather.forecast.map((day, index) => (
            <div key={index} className="forecast-item">
              <span className="forecast-day">{day.day}</span>
              <span className="forecast-icon">
                {getWeatherIcon(day.condition)}
              </span>
              <span className="forecast-temp">{day.temp}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
