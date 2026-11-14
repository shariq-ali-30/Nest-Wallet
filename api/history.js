const ETHERSCAN_API = 'https://api.etherscan.io/v2/api';
const SUPPORTED_CHAINS = new Set([1, 11155111, 42161, 8453, 137]);

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

const DEFAULT_ETHERSCAN_API_KEY = '1ZCZU1AKR11GPYWHVTQD9NTGRSG5BN45N7';

export function createHistoryHandler(apiKey = DEFAULT_ETHERSCAN_API_KEY) {
  return async function historyHandler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendJson(res, 405, { error: 'Method not allowed.' });
    }

    const url = new URL(req.url || '/', 'http://localhost');
    const address = url.searchParams.get('address') || '';
    const chainId = Number(url.searchParams.get('chainid'));
    const action = url.searchParams.get('action') || '';
    const page = Number(url.searchParams.get('page'));

    if (!apiKey) {
      return sendJson(res, 503, {
        error: 'Etherscan history is not configured. Add ETHERSCAN_API_KEY to .env.local or the Vercel environment settings.',
      });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return sendJson(res, 400, { error: 'A valid wallet address is required.' });
    }
    if (!SUPPORTED_CHAINS.has(chainId)) {
      return sendJson(res, 400, { error: 'This network is not enabled for transaction history.' });
    }
    if (!['txlist', 'tokentx'].includes(action)) {
      return sendJson(res, 400, { error: 'Unsupported history action.' });
    }
    if (!Number.isInteger(page) || page < 1 || page > 10) {
      return sendJson(res, 400, { error: 'History page must be between 1 and 10.' });
    }

    const params = new URLSearchParams({
      chainid: String(chainId),
      module: 'account',
      action,
      address,
      startblock: '0',
      endblock: '99999999',
      page: String(page),
      offset: '1000',
      sort: 'desc',
      apikey: apiKey,
    });

    try {
      const response = await fetch(ETHERSCAN_API + '?' + params.toString());
      const payload = await response.json();
      if (!response.ok) {
        return sendJson(res, 502, { error: 'Etherscan request failed. Please try again.' });
      }
      return sendJson(res, 200, payload);
    } catch {
      return sendJson(res, 502, { error: 'Could not reach Etherscan. Check the server connection and try again.' });
    }
  };
}

export default function handler(req, res) {
  return createHistoryHandler(process.env.ETHERSCAN_API_KEY || DEFAULT_ETHERSCAN_API_KEY)(req, res);
}
