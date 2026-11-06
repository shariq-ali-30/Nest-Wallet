import { useState } from 'react';
import { HDNodeWallet } from 'ethers';
import { Download, Plus, ShieldCheck } from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { parseSecretInput } from '../lib/wallet.js';
import { Button, Field, Modal, Notice, PasswordInput, cx, inputClass } from './ui.jsx';

export default function AddWalletModal({ open, onClose }) {
  const { wallets, createWallet } = useWallet();
  const [mode, setMode] = useState('create');
  const [generated] = useState(() => HDNodeWallet.createRandom());
  const [savedPhrase, setSavedPhrase] = useState(false);
  const [kind, setKind] = useState('mnemonic');
  const [secretInput, setSecretInput] = useState('');
  const [name, setName] = useState('Wallet ' + (wallets.length + 1));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password kam az kam 8 characters ka hona chahiye.');
    if (password !== confirm) return setError('Dono passwords match nahi karte.');
    if (!name.trim()) return setError('Wallet ka naam enter karein.');
    if (mode === 'create' && !savedPhrase) return setError('Pehle recovery phrase ko safe jagah par save karein.');
    let secret;
    try {
      secret = mode === 'create'
        ? { kind: 'mnemonic', value: generated.mnemonic.phrase }
        : parseSecretInput(kind, secretInput);
    } catch (err) {
      return setError(err.message);
    }
    setBusy(true);
    try {
      await createWallet(secret, password, name.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Wallet add nahi ho saka.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Add another wallet" onClose={onClose}>
      <div className="grid grid-cols-2 rounded-md border border-line bg-white p-1">
        <button type="button" onClick={() => { setMode('create'); setError(''); }}
          className={cx('rounded px-3 py-2 text-sm font-medium', mode === 'create' ? 'bg-brand text-white' : 'text-muted hover:text-ink')}>
          <Plus className="mr-1 inline size-4" /> Create new
        </button>
        <button type="button" onClick={() => { setMode('import'); setError(''); }}
          className={cx('rounded px-3 py-2 text-sm font-medium', mode === 'import' ? 'bg-brand text-white' : 'text-muted hover:text-ink')}>
          <Download className="mr-1 inline size-4" /> Import
        </button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'create' ? (
          <>
            <div>
              <p className="mb-2 text-sm font-medium">New wallet recovery phrase</p>
              <div className="rounded-md border border-line bg-canvas p-3 font-mono text-sm leading-7">
                {generated.mnemonic.phrase}
              </div>
            </div>
            <Notice tone="warn" title="Is phrase ko zaroor save karein">
              Ye phrase wallet recover karne ka wahid tareeqa hai. Isay kisi ke saath share na karein.
            </Notice>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={savedPhrase} onChange={(event) => setSavedPhrase(event.target.checked)}
                className="mt-0.5 size-4 accent-brand" />
              Main ne recovery phrase safe jagah par save kar li hai.
            </label>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 rounded-md border border-line bg-white p-1">
              {[
                ['mnemonic', 'Recovery phrase'],
                ['privateKey', 'Private key'],
              ].map(([id, label]) => (
                <button key={id} type="button" onClick={() => { setKind(id); setSecretInput(''); setError(''); }}
                  className={cx('rounded px-2 py-2 text-xs font-medium', kind === id ? 'bg-brand text-white' : 'text-muted hover:text-ink')}>
                  {label}
                </button>
              ))}
            </div>
            <Field label={kind === 'mnemonic' ? 'Recovery phrase' : 'Private key'} htmlFor="add-wallet-secret">
              {kind === 'mnemonic' ? (
                <textarea id="add-wallet-secret" rows={3} value={secretInput}
                  onChange={(event) => setSecretInput(event.target.value)} autoComplete="off"
                  autoCapitalize="none" spellCheck={false} className={inputClass + ' py-2 font-mono text-sm'} />
              ) : (
                <PasswordInput id="add-wallet-secret" value={secretInput}
                  onChange={(event) => setSecretInput(event.target.value)} autoComplete="off"
                  className="h-11 font-mono text-sm" />
              )}
            </Field>
          </>
        )}
        <Field label="Wallet name" htmlFor="add-wallet-name">
          <input id="add-wallet-name" value={name} maxLength={32}
            onChange={(event) => setName(event.target.value)} className={inputClass + ' h-11'} />
        </Field>
        <Field label="Set wallet password" htmlFor="add-wallet-password">
          <PasswordInput id="add-wallet-password" value={password}
            onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="h-11" />
        </Field>
        <Field label="Confirm password" htmlFor="add-wallet-confirm">
          <PasswordInput id="add-wallet-confirm" value={confirm}
            onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" className="h-11" />
        </Field>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}
          disabled={mode === 'import' && !secretInput.trim()}>
          <ShieldCheck className="size-4" /> Add wallet
        </Button>
      </form>
    </Modal>
  );
}
