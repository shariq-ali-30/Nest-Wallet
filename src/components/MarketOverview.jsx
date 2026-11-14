import { useEffect, useState } from 'react';
import { formatUnits } from 'ethers';
import { useWallet } from '../context/WalletContext.jsx';
import { Card } from './ui.jsx';

const PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true';

export default function MarketOverview() {
  const { balance, tokens, network, getFeePerGas } = useWallet();
  const [ethPrice, setEthPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [gasPrice, setGasPrice] = useState(null);

  useEffect(() => {
    if (network.testnet) {
      setEthPrice(null);
      setPriceChange(null);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const loadPrice = async () => {
      try {
        const response = await fetch(PRICE_URL, { signal: controller.signal });
        if (!response.ok) throw new Error('Price service unavailable');
        const json = await response.json();
        if (active && Number.isFinite(json.ethereum?.usd)) {
          setEthPrice(json.ethereum.usd);
          setPriceChange(Number.isFinite(json.ethereum.usd_24h_change) ? json.ethereum.usd_24h_change : null);
        }
      } catch {
        // Price data is optional; the wallet itself remains fully usable offline.
      }
    };

    loadPrice();
    const timer = window.setInterval(loadPrice, 60000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [network.testnet]);

  useEffect(() => {
    let active = true;
    const loadGas = async () => {
      try {
        const fee = await getFeePerGas();
        if (active && fee) setGasPrice(Number(formatUnits(fee, 9)));
      } catch {
        if (active) setGasPrice(null);
      }
    };
    loadGas();
    const timer = window.setInterval(loadGas, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [getFeePerGas]);

  const ethAmount = balance === null ? null : Number(formatUnits(balance, 18));
  // Only count built-in USDC contracts here; a custom token can reuse a ticker
  // without being a genuine stablecoin, so unknown tokens are deliberately excluded.
  const stablecoinValue = tokens.reduce((sum, token) => {
    if (!token.isDefault || token.symbol?.toUpperCase() !== 'USDC' || token.balance === null) {
      return sum;
    }
    return sum + Number(formatUnits(token.balance, token.decimals));
  }, 0);
  const includesNativeEth = network.symbol === 'ETH';
  const portfolioValue =
    includesNativeEth && ethPrice !== null && ethAmount !== null
      ? stablecoinValue + ethAmount * ethPrice
      : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="min-w-0 p-4">
        <p className="text-sm font-medium text-muted">
          {network.testnet ? 'Testnet portfolio' : 'Estimated portfolio value'}
        </p>
        {network.testnet ? (
          <>
            <p className="mt-2 text-xl font-semibold">Test assets</p>
            <p className="mt-1 text-xs text-muted">Sepolia coins have no real monetary value.</p>
          </>
        ) : portfolioValue === null ? (
          <>
            <p className="mt-2 text-xl font-semibold">Price unavailable</p>
            <p className="mt-1 text-xs text-muted">Market prices could not be loaded right now.</p>
          </>
        ) : (
          <>
            <p className="mt-2 break-all text-2xl font-semibold tabular-nums">
              {portfolioValue.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-muted">
              Includes ETH and built-in USDC at an approximate $1 peg. Custom tokens are excluded.
              {priceChange !== null ? ` ETH 24h: ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%` : ''}
            </p>
          </>
        )}
      </Card>

      <Card className="min-w-0 p-4">
        <p className="text-sm font-medium text-muted">Network gas tracker</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {gasPrice === null ? '—' : gasPrice.toFixed(2) + ' Gwei'}
        </p>
        <p className="mt-1 text-xs text-muted">
          {network.name} estimated fee price. Actual transaction fees can change before confirmation.
        </p>
      </Card>
    </div>
  );
}
