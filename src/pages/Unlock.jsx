import { useState } from 'react';
import { Lock, Wallet as WalletIcon } from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { APP_NAME } from '../lib/networks.js';
import { shortAddr } from '../lib/format.js';
import { Button, Field, Modal, Notice, PasswordInput } from '../components/ui.jsx';

export default function Unlock() {
  const { address, unlock, resetWallet } = useWallet();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await unlock(password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-brand text-white">
            <WalletIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-semibold">{APP_NAME}</span>
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-lg border border-line bg-white p-6">
          <div>
            <h1 className="text-xl font-semibold">Unlock your wallet</h1>
            <p className="mt-1 font-mono text-sm text-muted">{shortAddr(address, 8, 6)}</p>
          </div>

          <Field label="Password" htmlFor="pw" error={error}>
            <PasswordInput
              id="pw"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </Field>

          <Button type="submit" size="lg" icon={Lock} loading={busy} disabled={!password} className="w-full">
            Unlock
          </Button>

          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="block w-full text-center text-sm text-brand hover:underline"
          >
            Forgot your password?
          </button>
        </form>
      </div>

      <Modal
        open={resetOpen}
        title="Reset this wallet"
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={resetWallet}>
              Erase from this device
            </Button>
          </>
        }
      >
        <Notice tone="warn" title="Your recovery phrase is the only way back in">
          Resetting removes the wallet from this browser. You can restore it by importing your
          recovery phrase and choosing a new password. Without the phrase, the funds cannot be
          recovered.
        </Notice>
      </Modal>
    </div>
  );
}
