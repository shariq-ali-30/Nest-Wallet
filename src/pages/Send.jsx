import { useCallback, useMemo, useState } from 'react';
import { formatEther, formatUnits, isAddress, parseUnits } from 'ethers';
import { ArrowLeft, Camera, CheckCircle2, ExternalLink, Send as SendIcon } from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { formatAmount, friendlyError, shortAddr } from '../lib/format.js';
import { Button, Card, Field, Notice, inputClass } from '../components/ui.jsx';
import QRScanner from '../components/QRScanner.jsx';

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="break-all text-right font-medium">{children}</dd>
    </div>
  );
}

export default function Send({ onNavigate }) {
  const { address, balance, tokens, contacts, network, estimateSend, sendAsset, getFeePerGas } = useWallet();

  const [assetId, setAssetId] = useState('eth');
  const [to, setTo] = useState('');
  const [contactChoice, setContactChoice] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('form');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState(null);

  const handleQrDetected = useCallback((rawValue) => {
    const scanned = String(rawValue || '')
      .trim()
      .replace(/^ethereum:/i, '')
      .split(/[?@/]/)[0];
    if (!isAddress(scanned)) {
      setError('Scanned QR code mein valid Ethereum address nahi mila.');
      return;
    }
    setTo(scanned);
    setContactChoice('');
    setError('');
  }, []);

  const asset = useMemo(() => {
    if (assetId === 'eth') return { kind: 'eth', symbol: network.symbol, decimals: 18, balance };
    const t = tokens.find((x) => x.address === assetId);
    return t ? { kind: 'token', ...t } : { kind: 'eth', symbol: network.symbol, decimals: 18, balance };
  }, [assetId, tokens, balance, network.symbol]);

  const setMax = async () => {
    if (asset.balance === null) return;
    if (asset.kind === 'token') return setAmount(formatUnits(asset.balance, asset.decimals));
    try {
      const reserve = (21000n * (await getFeePerGas()) * 11n) / 10n;
      const max = asset.balance > reserve ? asset.balance - reserve : 0n;
      setAmount(formatEther(max));
    } catch {
      setError('Could not estimate the network fee. Try again.');
    }
  };

  const review = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAddress(to.trim())) return setError('Enter a valid wallet address (0x followed by 40 characters).');
    let value;
    try {
      value = parseUnits(amount.trim(), asset.decimals);
    } catch {
      return setError(`Enter a valid amount. ${asset.symbol} supports up to ${asset.decimals} decimal places.`);
    }
    if (value <= 0n) return setError('Enter an amount greater than zero.');
    if (asset.balance !== null && value > asset.balance) return setError(`The amount is more than your ${asset.symbol} balance.`);

    setBusy(true);
    try {
      const q = await estimateSend({ asset, to: to.trim(), amount: amount.trim() });
      if (asset.kind === 'eth' && q.value + q.fee > balance) {
        setError('Not enough ETH to cover the amount and the network fee. Try a smaller amount.');
      } else if (asset.kind === 'token' && balance !== null && q.fee > balance) {
        setError('Not enough ${network.symbol} to pay the network fee for this token transfer.');
      } else {
        setQuote(q);
        setStep('review');
      }
    } catch (err) {
      setError(friendlyError(err));
    }
    setBusy(false);
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      setTx(await sendAsset({ asset, to: to.trim(), value: quote.value }));
      setStep('done');
    } catch (err) {
      setError(friendlyError(err));
    }
    setBusy(false);
  };

  const reset = () => {
    setTo('');
    setContactChoice('');
    setAmount('');
    setQuote(null);
    setTx(null);
    setError('');
    setStep('form');
  };

  if (step === 'done') {
    return (
      <Card className="mx-auto max-w-xl p-6">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-ok-soft text-ok">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-semibold">Transaction submitted</h2>
          <p className="mt-1 text-muted">
            {formatAmount(quote.value, asset.decimals)} {asset.symbol} is on its way to {shortAddr(to.trim())}. It
            usually confirms within a minute.
          </p>
          <p className="mt-4 w-full break-all rounded-md bg-canvas p-3 font-mono text-xs">{tx.hash}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={`${network.explorer}/tx/${tx.hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-medium hover:bg-canvas"
            >
              View on explorer <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            <Button onClick={() => onNavigate('activity')}>See activity</Button>
            <Button variant="ghost" onClick={reset}>
              Send another
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (step === 'review') {
    return (
      <Card className="mx-auto max-w-xl p-6">
        <button
          type="button"
          onClick={() => setStep('form')}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Edit
        </button>
        <h2 className="text-xl font-semibold">Review transaction</h2>
        <dl className="mt-4 divide-y divide-line text-sm">
          <Row label="From">{shortAddr(address, 8, 6)}</Row>
          <Row label="To">{to.trim()}</Row>
          <Row label="Amount">
            {formatAmount(quote.value, asset.decimals, 8)} {asset.symbol}
          </Row>
          <Row label="Network">{network.name}</Row>
          <Row label="Estimated network fee">{formatAmount(quote.fee, 18, 8)} {network.symbol}</Row>
          {asset.kind === 'eth' && (
            <Row label="Total">{formatAmount(quote.value + quote.fee, 18, 8)} {network.symbol}</Row>
          )}
        </dl>
        {!network.testnet && (
          <Notice tone="warn" className="mt-4">
            This is a live network. Transactions use real assets and cannot be reversed.
          </Notice>
        )}
        {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setStep('form')} disabled={busy}>
            Back
          </Button>
          <Button className="flex-1" icon={SendIcon} loading={busy} onClick={confirm}>
            Confirm and send
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl p-6">
      <form onSubmit={review} className="space-y-5">
        <Field label="Asset" htmlFor="asset">
          <select
            id="asset"
            value={assetId}
            onChange={(e) => {
              setAssetId(e.target.value);
              setAmount('');
              setError('');
            }}
            className={`${inputClass} h-11`}
          >
            <option value="eth">{network.symbol}</option>
            {tokens.map((t) => (
              <option key={t.address} value={t.address}>
                {t.symbol} ({t.name})
              </option>
            ))}
          </select>
        </Field>

        {contacts.length > 0 && (
          <Field label="Saved recipient" htmlFor="saved-recipient">
            <select
              id="saved-recipient"
              value={contactChoice}
              onChange={(e) => {
                const selected = e.target.value;
                setContactChoice(selected);
                if (selected) setTo(selected);
                setError('');
              }}
              className={inputClass + ' h-11'}
            >
              <option value="">Choose a saved address</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.address}>
                  {contact.name} — {contact.address.slice(0, 8)}...{contact.address.slice(-6)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Recipient address" htmlFor="to">
          <div className="flex min-w-0 gap-2">
            <input
              id="to"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setContactChoice('');
              }}
              placeholder="0x..."
              autoComplete="off"
              spellCheck={false}
              className={inputClass + ' h-11 min-w-0 flex-1 font-mono text-sm'}
            />
            <Button type="button" size="sm" variant="secondary" icon={Camera} onClick={() => setScannerOpen(true)}>
              Scan
            </Button>
          </div>
        </Field>

        <Field
          label="Amount"
          htmlFor="amount"
          hint={`Available: ${formatAmount(asset.balance, asset.decimals, 6)} ${asset.symbol}`}
        >
          <div className="relative">
            <input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              autoComplete="off"
              className={`${inputClass} h-11 pr-28 tabular-nums`}
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-2">
              <span className="text-sm text-muted">{asset.symbol}</span>
              <button
                type="button"
                onClick={setMax}
                className="rounded px-2 py-1 text-sm font-medium text-brand hover:bg-brand-soft"
              >
                Max
              </button>
            </div>
          </div>
        </Field>

        {error && <Notice tone="danger">{error}</Notice>}

        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!to.trim() || !amount.trim()}>
          Review
        </Button>
      </form>
      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleQrDetected}
      />
    </Card>
  );
}
