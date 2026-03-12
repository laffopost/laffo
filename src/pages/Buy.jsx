import { QuickTrade } from "../components/features/trading";
import "./Buy.css";

export default function Buy() {
  return (
    <div className="buy-page">
      <QuickTrade title="Buy LAFFO 💎" showSteps={true} />
    </div>
  );
}
