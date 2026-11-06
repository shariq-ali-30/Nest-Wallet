import { useState } from 'react';
import {
  ArrowDownToLine,
  Coins,
  History,
  Plus,
  RefreshCw,
  Send as SendIcon,
  Trash2,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { formatAmount, shortAddr } from '../lib/format.js';
import { Button, Card, CardHeader, CopyButton, EmptyState, Field, Modal, Notice, Spinner, inputClass } from '../components/ui.jsx';
import TxRow from '../components/TxRow.jsx';

function AddTokenModal({ open, onClose }) {
  const { lookupToken, addToken, network } = useWallet();
  const [address, setAddress] = useState('');
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setAddress('');
    setToken(null);
    setError('');
    onClose();
  };

  const find = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setToken(null);
    try {
      setToken(await lookupToken(address));
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <Modal
      open={open}
      title="Add a token"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!token}
            onClick={() => {
              addToken(token);
              close();
            }}
          >
            Add token
          </Button>
        </>
      }
    >
      <form onSubmit={find} className="space-y-4">
        <Field
          label="Token contract address"
          htmlFor="token-addr"
          hint={`The ERC-20 contract on ${network.name}.`}
          error={error}
        >
          <input
            id="token-addr"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            autoComplete="off"
            spellCheck={false}
            className={`${inputClass} h-11 font-mono text-sm`}
          />
        </Field>
        <Button type="submit" variant="secondary" loading={busy} disabled={!address.trim()}>
          Find token
        </Button>
      </form>
      {token && (
        <Notice tone="success" title={`${token.name} (${token.symbol})`}>
          {token.decimals} decimals. Ready to add.
        </Notice>
      )}
    </Modal>
  );
}

export default function Dashboard({ onNavigate }) {
  const { address, balance, balanceError, network, tokens, activity, refreshAll, refreshing, removeToken } =
    useWallet();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="min-w-0 w-full max-w-full space-y-6">
      <section className="rounded-lg bg-brand p-6 text-white md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">Balance on {network.name}</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums md:text-5xl">
              {formatAmount(balance, 18, 6)}{' '}
              <span className="text-2xl font-medium text-white/80">{network.symbol}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            aria-label="Refresh balance"
            className="inline-flex size-10 items-center justify-center rounded-md text-white hover:bg-white/15"
          >
            <RefreshCw className={refreshing ? 'size-5 animate-spin' : 'size-5'} />
          </button>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-md bg-white/10 py-1.5 pl-3 pr-1.5 font-mono text-sm">
          {shortAddr(address, 8, 6)}
          <CopyButton text={address} tone="light" label="Copy address" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="light" icon={SendIcon} onClick={() => onNavigate('send')}>
            Send
          </Button>
          <Button variant="lightOutline" icon={ArrowDownToLine} onClick={() => onNavigate('receive')}>
            Receive
          </Button>
        </div>
      </section>

      {balanceError && <Notice tone="danger">{balanceError}</Notice>}

      {network.testnet && balance === 0n && (
        <Notice tone="info" title="Your balance is empty">
          Testnet coins are free. Search for a &quot;Sepolia faucet&quot;, paste your address and
          request test ETH. It arrives in a minute or two.
        </Notice>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader
            title="Tokens"
            action={
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAddOpen(true)}>
                Add token
              </Button>
            }
          />
          {tokens.length === 0 ? (
            <EmptyState icon={Coins} title="No tokens yet">
              Add an ERC-20 token by its contract address to see its balance and send it.
            </EmptyState>
          ) : (
            <ul className="min-w-0 divide-y divide-line">
              {tokens.map((t) => (
                <li key={t.address} className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
                    {t.symbol.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="text-sm text-muted">{t.symbol}</p>
                  </div>
                  <p className="ml-auto max-w-full break-all text-right text-sm font-medium tabular-nums">
                    {t.balance === null ? <Spinner className="size-4 text-muted" /> : formatAmount(t.balance, t.decimals)}
                  </p>
                  {!t.isDefault && (
                    <button
                      type="button"
                      onClick={() => removeToken(t.address)}
                      aria-label={`Remove ${t.symbol}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader
            title="Recent activity"
            action={
              <Button size="sm" variant="ghost" onClick={() => onNavigate('activity')}>
                View all
              </Button>
            }
          />
          {activity.length === 0 ? (
            <EmptyState icon={History} title="No transactions yet">
              Sent and received transactions will appear here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {activity.slice(0, 4).map((tx) => (
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

      <AddTokenModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
