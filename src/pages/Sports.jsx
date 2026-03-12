import { SportsResults } from "../components/features/utilities";
import "./Sports.css";

export default function Sports() {
  return (
    <div className="sports-page">
      <div className="page-header">
        <h1>Sports Center</h1>
        <p>Live scores, upcoming matches, and sports results</p>
      </div>

      <div className="sports-container">
        <SportsResults />
      </div>
    </div>
  );
}
