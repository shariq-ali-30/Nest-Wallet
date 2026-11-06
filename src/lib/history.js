// Transaction history comes from the Etherscan API (blockchain nodes cannot list history).
const API = 'https://api.etherscan.io/v2/api';
const KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

export const hasHistoryKey = Boolean(KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(params) {
  const qs = new URLSearchParams({ ...params, apikey: KEY });
  const res = await fetch(`${API}?${qs}`);
  if (!res.ok) throw new Error('Etherscan request failed.');
  const json = await res.json();
  if (json.status === '1') return json.result;
  if (json.message === 'No transactions found') return [];
  throw new Error(typeof json.result === 'string' ? json.result : json.message || 'Etherscan error.');
}

export async function fetchHistory({ address, chainId }) {
  if (!KEY) throw new Error('NO_KEY');
  const base = {
    chainid: String(chainId),
    module: 'account',
    address,
    startblock: '0',
    endblock: '99999999',
    page: '1',
    offset: '50',
    sort: 'desc',
  };

  const normal = await call({ ...base, action: 'txlist' });
  await sleep(400); // free plan allows only a few requests per second
  const tokenTx = await call({ ...base, action: 'tokentx' });

  const tokenHashes = new Set(tokenTx.map((t) => t.hash.toLowerCase()));

  const eth = normal
    .filter((t) => !(t.value === '0' && tokenHashes.has(t.hash.toLowerCase())))
    .map((t) => ({
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value,
      timestamp: Number(t.timeStamp),
      status: t.isError === '1' ? 'failed' : 'success',
      kind: 'eth',
      symbol: 'ETH',
      decimals: 18,
      isCall: t.value === '0' && Boolean(t.input) && t.input !== '0x',
    }));

  const tokens = tokenTx.map((t) => ({
    hash: t.hash,
    from: t.from,
    to: t.to,
    value: t.value,
    timestamp: Number(t.timeStamp),
    status: 'success',
    kind: 'token',
    symbol: t.tokenSymbol,
    decimals: Number(t.tokenDecimal),
    isCall: false,
  }));

  return [...eth, ...tokens];
}

// Combines transactions sent from this app (instant) with Etherscan history.
export function mergeActivity(local, remote) {
  const map = new Map();
  for (const t of local) map.set(t.hash.toLowerCase(), t);
  for (const t of remote) {
    const k = t.hash.toLowerCase();
    const existing = map.get(k);
    if (existing && existing.kind === 'token' && t.kind === 'eth') {
      map.set(k, { ...existing, status: t.status, timestamp: t.timestamp || existing.timestamp });
    } else {
      map.set(k, t);
    }
  }
  return [...map.values()].sort((a, b) => b.timestamp - a.timestamp);
}
