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
    <li className="flex w-full min-w-0 items-start gap-3 overflow-hidden px-4 py-4 sm:gap-4 sm:px-5">
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
          {tx.status === 'success' && <Badge tone="ok">Confirmed</Badge>}
        </div>
        <p className="truncate text-sm text-muted">
          {party} <span aria-hidden="true">&middot;</span> {formatDate(tx.timestamp)}
        </p>
      </div>

      <div className="w-[38%] min-w-0 shrink-0 text-right sm:w-auto sm:max-w-[45%]">
        <p className={cx('max-w-full break-all text-xs font-medium tabular-nums sm:text-sm', !out && !isCall && 'text-ok')}>
          {sign}
          {formatAmount(tx.value, tx.decimals)} {tx.symbol}
        </p>
        <a
          href={`${network.explorer}/tx/${tx.hash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-brand hover:underline"
        >
          Details <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </li>
  );
}
