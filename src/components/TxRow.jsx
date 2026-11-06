import { ArrowDownLeft, ArrowUpRight, Clock, ExternalLink, FileCode2 } from 'lucide-react';
import { Badge, cx } from './ui.jsx';
import { formatAmount, formatDate, shortAddr } from '../lib/format.js';

export default function TxRow({ tx, address, network }) {
  const out = tx.from?.toLowerCase() === address.toLowerCase();
  const isCall = tx.kind === 'eth' && tx.isCall;

  const title = isCall ? 'Contract interaction' : out ? `Sent ${tx.symbol}` : `Received ${tx.symbol}`;
  const party = out
    ? tx.to
      ? `To ${shortAddr(tx.to)}`
      : 'Contract creation'
    : `From ${shortAddr(tx.from)}`;
  const Icon = isCall ? FileCode2 : out ? ArrowUpRight : ArrowDownLeft;
  const sign = isCall ? '' : out ? '-' : '+';

  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span
        className={cx(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-full',
          out || isCall ? 'bg-canvas text-ink' : 'bg-ok-soft text-ok'
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{title}</p>
          {tx.status === 'pending' && (
            <Badge tone="warn">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden="true" /> Pending
              </span>
            </Badge>
          )}
          {tx.status === 'failed' && <Badge tone="danger">Failed</Badge>}
        </div>
        <p className="truncate text-sm text-muted">
          {party} <span aria-hidden="true">&middot;</span> {formatDate(tx.timestamp)}
        </p>
      </div>

      <div className="text-right">
        <p className={cx('font-medium tabular-nums', !out && !isCall && 'text-ok')}>
          {sign}
          {formatAmount(tx.value, tx.decimals)} {tx.symbol}
        </p>
        <a
          href={`${network.explorer}/tx/${tx.hash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
        >
          Details <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </li>
  );
}
