import { useMemo, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { hasHistoryKey } from '../lib/history.js';
import { Button, Card, EmptyState, Notice, cx } from '../components/ui.jsx';
import TxRow from '../components/TxRow.jsx';

const FILTERS = [
  ['all', 'All'],
  ['out', 'Sent'],
  ['in', 'Received'],
];

export default function Activity() {
  const { activity, address, network, historyError, refreshAll, refreshing } = useWallet();
  const [filter, setFilter] = useState('all');

  const rows = useMemo(
    () =>
      activity.filter((t) => {
        const out = t.from?.toLowerCase() === address.toLowerCase();
        return filter === 'all' || (filter === 'out' ? out : !out);
      }),
    [activity, address, filter]
  );

  return (
    <div className="space-y-4">
      {!hasHistoryKey ? (
        <Notice tone="info" title="Full history needs an Etherscan API key">
          Right now only transactions sent from this app are shown. Add a free key to
          <span className="font-mono"> .env </span>
          as <span className="font-mono">VITE_ETHERSCAN_API_KEY</span> and restart the dev server to
          load your complete history.
        </Notice>
      ) : (
        historyError && <Notice tone="danger" title="Could not load history">{historyError}</Notice>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex gap-1" role="tablist">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={cx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === id ? 'bg-brand text-white' : 'text-muted hover:bg-canvas hover:text-ink'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" icon={RefreshCw} loading={refreshing} onClick={refreshAll}>
            Refresh
          </Button>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={History} title="No transactions to show">
            Transactions on {network.name} will appear here once you send or receive funds.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((tx) => (
              <TxRow key={tx.hash} tx={tx} address={address} network={network} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
