import { useState } from 'react';
import { isAddress } from 'ethers';
import { Wallet } from 'ethers';
import { BookUser, Check, Eye, KeyRound, Lock, Trash2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { hasHistoryKey } from '../lib/history.js';
import { Button, Card, CardHeader, CopyButton, Field, Modal, Notice, cx, inputClass } from '../components/ui.jsx';

function SecretModal({ kind, onClose }) {
  const { revealSecret } = useWallet();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [secret, setSecret] = useState(null);
  const [busy, setBusy] = useState(false);

  const isPhrase = kind === 'phrase';
  const title = isPhrase ? 'Recovery phrase' : 'Private key';

  const close = () => {
    setSecret(null);
    setPassword('');
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const s = await revealSecret(password);
      if (isPhrase && s.kind !== 'mnemonic') {
        setError('This wallet was imported with a private key, so it has no recovery phrase.');
      } else if (isPhrase) {
        setSecret(s.value);
      } else if (s.kind === 'privateKey') {
        setSecret(s.value);
      } else {
        setSecret(Wallet.fromPhrase(s.value).privateKey);
      }
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <Modal
      open={Boolean(kind)}
      title={title}
      onClose={close}
      footer={
        <Button variant="secondary" onClick={close}>
          Close
        </Button>
      }
    >
      {secret ? (
        <>
          <Notice tone="danger" title="Keep this private">
            Anyone who sees this can take all your funds. Do not share it or take a screenshot.
          </Notice>
          <div className="flex min-w-0 items-start gap-2 rounded-md bg-canvas p-3">
            <p className="min-w-0 flex-1 break-all font-mono text-xs sm:text-sm [overflow-wrap:anywhere]">{secret}</p>
            <div className="shrink-0"><CopyButton text={secret} /></div>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Enter your password to continue" htmlFor="reveal-pw" error={error}>
            <input
              id="reveal-pw"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} h-11`}
            />
          </Field>
          <Button type="submit" loading={busy} disabled={!password}>
            Show {title.toLowerCase()}
          </Button>
        </form>
      )}
    </Modal>
  );
}

export default function Settings() {
  const { address, network, networks, switchNetwork, lock, resetWallet, contacts, addContact, removeContact } = useWallet();
  const [secretKind, setSecretKind] = useState(null);
  const [contactName, setContactName] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactError, setContactError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader title="Network" />
        <ul className="divide-y divide-line" role="radiogroup" aria-label="Network">
          {Object.values(networks).map((n) => {
            const active = n.id === network.id;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => switchNetwork(n.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-canvas"
                >
                  <span>
                    <span className="block font-medium">{n.name}</span>
                    <span className="block text-sm text-muted">
                      {n.testnet ? 'Free test coins. Best for practice.' : 'Real ETH and real fees.'}
                    </span>
                  </span>
                  <span
                    className={cx(
                      'inline-flex size-6 items-center justify-center rounded-full border',
                      active ? 'border-brand bg-brand text-white' : 'border-line'
                    )}
                  >
                    {active && <Check className="size-4" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Account" />
        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="text-sm text-muted">Wallet address</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="break-all font-mono text-sm">{address}</p>
              <CopyButton text={address} label="Copy address" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted">Transaction history</p>
            <p className="mt-1 text-sm">
              {hasHistoryKey ? 'Etherscan API key found.' : 'No Etherscan API key set. See the README to enable full history.'}
            </p>
          </div>
          <p className="text-sm text-muted">The wallet locks automatically after 10 minutes of inactivity.</p>
          <Button variant="secondary" icon={Lock} onClick={lock}>
            Lock wallet
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Address book" action={<BookUser className="size-5 text-muted" />} />
        <div className="space-y-4 px-5 py-4">
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              setContactError('');
              try {
                if (!isAddress(contactAddress.trim())) throw new Error('Enter a valid wallet address.');
                addContact({ name: contactName, address: contactAddress });
                setContactName('');
                setContactAddress('');
              } catch (err) {
                setContactError(err.message);
              }
            }}
          >
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Contact name"
              aria-label="Contact name"
              className={inputClass + ' h-10'}
            />
            <input
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              placeholder="0x wallet address"
              aria-label="Contact wallet address"
              autoComplete="off"
              spellCheck={false}
              className={inputClass + ' h-10 font-mono text-xs'}
            />
            <Button type="submit" disabled={!contactName.trim() || !contactAddress.trim()}>Save</Button>
          </form>
          {contactError && <p className="text-sm text-danger" role="alert">{contactError}</p>}
          {contacts.length ? (
            <ul className="divide-y divide-line">
              {contacts.map((contact) => (
                <li key={contact.id} className="flex min-w-0 items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{contact.name}</p>
                    <p className="break-all font-mono text-xs text-muted">{contact.address}</p>
                  </div>
                  <CopyButton text={contact.address} label="Copy saved address" />
                  <button
                    type="button"
                    onClick={() => removeContact(contact.address)}
                    aria-label={'Remove ' + contact.name}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Abhi koi saved address nahi hai. Yahan save kiye gaye addresses Send page par milenge.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Backup" />
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-muted">Your password is required to view these. Make sure nobody is watching your screen.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" icon={Eye} onClick={() => setSecretKind('phrase')}>
              Show recovery phrase
            </Button>
            <Button variant="secondary" icon={KeyRound} onClick={() => setSecretKind('key')}>
              Show private key
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-danger/30">
        <CardHeader title="Remove wallet" />
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-muted">
            This erases the wallet from this browser. You can restore it only with your recovery phrase or
            private key.
          </p>
          <Button variant="dangerOutline" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            Remove wallet from this device
          </Button>
        </div>
      </Card>

      {secretKind && <SecretModal kind={secretKind} onClose={() => setSecretKind(null)} />}

      <Modal
        open={deleteOpen}
        title="Remove wallet"
        onClose={() => {
          setDeleteOpen(false);
          setConfirmText('');
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={confirmText !== 'REMOVE'} onClick={resetWallet}>
              Remove wallet
            </Button>
          </>
        }
      >
        <Notice tone="danger" title="Back up first">
          If you have not saved your recovery phrase, the funds in this wallet will be lost forever.
        </Notice>
        <Field label="Type REMOVE to confirm" htmlFor="remove-confirm">
          <input
            id="remove-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            className={`${inputClass} h-11`}
          />
        </Field>
      </Modal>
    </div>
  );
}
