import { StockTracker } from "../components/features/trading";
import "./Stocks.css";

export default function Stocks() {
  return (
    <div className="stocks-page">
      <div className="page-header">
        <h1>Stock Market</h1>
        <p>Real-time stock prices, charts, and market data</p>
      </div>

      <div className="stocks-container">
        <StockTracker />
      </div>
    </div>
  );
}
