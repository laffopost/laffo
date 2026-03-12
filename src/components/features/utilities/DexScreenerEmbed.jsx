import { memo } from "react";
import "./DexScreenerEmbed.css";

const DexScreenerEmbed = memo(() => {
  return (
    <div className="dexscreener-wrapper">
      <div className="dexscreener-embed">
        <iframe
          src="https://dexscreener.com/solana/5b77RtzjNDVK7KPbvcoGyu2qUks6qQSYhbV6WvGj3JvV?embed=1&loadChartSettings=0&chartDefaultOnMobile=1&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=15"
          title="DexScreener Chart"
          loading="lazy"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
});

export default DexScreenerEmbed;
