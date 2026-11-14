import { useMemo, useState } from 'react';
import { Download, History, RefreshCw } from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { formatAmount } from '../lib/format.js';
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
  const [statusFilter, setStatusFilter] = useState('all');

  const rows = useMemo(
    () =>
      activity.filter((t) => {
        const owner = address?.toLowerCase();
        const out = t.from?.toLowerCase() === owner;
        const incoming = t.to?.toLowerCase() === owner;
        const matchesDirection = filter === 'all' || (filter === 'out' ? out : incoming);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'confirmed' ? t.status === 'success' : t.status === statusFilter);
        return matchesDirection && matchesStatus;
      }),
    [activity, address, filter, statusFilter]
  );

  const exportCsv = () => {
    const escapeCell = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
    const header = ['Direction', 'Asset', 'Amount', 'Status', 'From', 'To', 'Timestamp', 'Transaction Hash'];
    const data = rows.map((tx) => [
      tx.from?.toLowerCase() === address?.toLowerCase() ? 'Sent' : 'Received',
      tx.symbol,
      formatAmount(tx.value, tx.decimals, 12),
      tx.status,
      tx.from,
      tx.to,
      new Date(tx.timestamp * 1000).toISOString(),
      tx.hash,
    ]);
    const csv = [header, ...data].map((line) => line.map(escapeCell).join(',')).join(String.fromCharCode(13, 10));
    const blob = new Blob([String.fromCharCode(0xfeff), csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nest-wallet-' + network.id + '-transactions.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      {historyError && <Notice tone="danger" title="Could not load history">{historyError}</Notice>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
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
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Transaction status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 max-w-[42vw] rounded-md border border-line bg-white px-2 text-xs font-medium text-ink sm:text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="failed">Failed</option>
            </select>
            <Button size="sm" variant="secondary" icon={Download} disabled={!rows.length} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button size="sm" variant="secondary" icon={RefreshCw} loading={refreshing} onClick={refreshAll}>
              Refresh
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={History} title="No transactions to show">
            Transactions on {network.name} will appear here once you send or receive funds.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((tx) => (
              <TxRow
                key={`${tx.hash}-${tx.contractAddress || tx.kind}-${tx.logIndex ?? tx.to}-${tx.value}`}
                tx={tx}
                address={address}
                network={network}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
