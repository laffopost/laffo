import { DexScreenerEmbed } from "../components/features/utilities";
import { QuickTrade } from "../components/features/trading";
import "./Chart.css";

export default function Chart() {
  return (
    <div className="chart-page">
      <div className="chart-container">
        <DexScreenerEmbed />
      </div>

      <QuickTrade title="Quick Trade" showSteps={false} />
    </div>
  );
}
