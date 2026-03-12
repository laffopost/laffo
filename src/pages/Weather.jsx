import { WeatherWidget } from "../components/features/weather";
import "./Weather.css";

export default function Weather() {
  return (
    <div className="weather-page">
      <div className="page-header">
        <h1>Weather Center</h1>
        <p>Current weather conditions and forecasts worldwide</p>
      </div>

      <div className="weather-container">
        <WeatherWidget />
      </div>
    </div>
  );
}
