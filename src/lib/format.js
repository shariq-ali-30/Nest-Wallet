import { formatUnits } from 'ethers';

export const shortAddr = (a, head = 6, tail = 4) =>
  a ? `${a.slice(0, head)}...${a.slice(-tail)}` : '';

export function formatAmount(value, decimals = 18, maxDecimals = 6) {
  if (value === null || value === undefined) return '...';
  const big = BigInt(value);
  const [int, frac = ''] = formatUnits(big, decimals).split('.');
  const trimmed = frac.slice(0, maxDecimals).replace(/0+$/, '');
  if (big > 0n && int === '0' && !trimmed) return `<0.${'0'.repeat(maxDecimals - 1)}1`;
  return trimmed ? `${int}.${trimmed}` : int;
}

export function formatDate(seconds) {
  if (!seconds) return '';
  return new Date(seconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function friendlyError(e) {
  const msg = e?.shortMessage || e?.reason || e?.message || 'Something went wrong.';
  if (/user rejected|denied/i.test(msg)) return 'The transaction was cancelled.';
  if (/insufficient funds/i.test(msg)) return 'Not enough ETH to cover the amount and network fee.';
  return msg.length > 160 ? `${msg.slice(0, 160)}...` : msg;
}
