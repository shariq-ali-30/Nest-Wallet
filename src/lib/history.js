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
  if (Array.isArray(json.result)) return json.result;

  const resultMessage = typeof json.result === 'string' ? json.result : '';
  const responseMessage = `${json.message || ''} ${resultMessage}`.toLowerCase();
  if (responseMessage.includes('no transactions found')) return [];

  throw new Error(resultMessage || json.message || 'Etherscan error.');
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
    offset: '100',
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
    contractAddress: t.contractAddress,
    logIndex: t.logIndex,
    symbol: t.tokenSymbol,
    decimals: Number(t.tokenDecimal),
    status: t.isError === '1' ? 'failed' : 'success',
    isCall: false,
  }));

  return [...eth, ...tokens];
}

// Keep separate ERC-20 log transfers distinct, even when they share a tx hash.
// Local sends are merged with explorer records so pending status becomes confirmed.
function activityKey(tx) {
  const hash = (tx.hash || '').toLowerCase();
  if (tx.kind === 'token') {
    const token = (tx.contractAddress || tx.symbol || 'token').toLowerCase();
    return [hash, 'token', token, tx.from?.toLowerCase(), tx.to?.toLowerCase(), tx.value].join(':');
  }
  return `${hash}:eth`;
}

export function mergeActivity(local, remote) {
  const map = new Map();
  for (const tx of local) map.set(activityKey(tx), tx);

  for (const tx of remote) {
    const key = activityKey(tx);
    let existing = map.get(key);

    // Older locally saved token records did not store their contract address.
    if (!existing && tx.kind === 'token') {
      for (const [localKey, localTx] of map.entries()) {
        if (
          localTx.kind === 'token' &&
          !localTx.contractAddress &&
          localTx.hash?.toLowerCase() === tx.hash?.toLowerCase() &&
          localTx.from?.toLowerCase() === tx.from?.toLowerCase() &&
          localTx.to?.toLowerCase() === tx.to?.toLowerCase() &&
          localTx.value === tx.value &&
          localTx.symbol?.toLowerCase() === tx.symbol?.toLowerCase()
        ) {
          existing = localTx;
          map.delete(localKey);
          break;
        }
      }
    }

    map.set(key, existing ? { ...existing, ...tx } : tx);
  }

  return [...map.values()].sort((a, b) => b.timestamp - a.timestamp);
}
