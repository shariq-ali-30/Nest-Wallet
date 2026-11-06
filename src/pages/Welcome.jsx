import { useState } from 'react';
import { HDNodeWallet } from 'ethers';
import {
  ArrowLeft,
  ArrowLeftRight,
  Download,
  Eye,
  EyeOff,
  FlaskConical,
  Plus,
  ShieldCheck,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { APP_NAME } from '../lib/networks.js';
import { parseSecretInput } from '../lib/wallet.js';
import { Button, Field, Notice, cx, inputClass } from '../components/ui.jsx';

const FEATURES = [
  { icon: ShieldCheck, text: 'Your keys are encrypted and stay on this device.' },
  { icon: ArrowLeftRight, text: 'Send and receive ETH and ERC-20 tokens.' },
  { icon: FlaskConical, text: 'Practice safely on the Sepolia test network.' },
];

function PasswordFields({ password, setPassword, confirm, setConfirm, error }) {
  return (
    <>
      <Field label="Password" htmlFor="new-pw" hint="At least 8 characters. It unlocks the wallet on this device.">
        <input
          id="new-pw"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClass} h-11`}
        />
      </Field>
      <Field label="Confirm password" htmlFor="confirm-pw" error={error}>
        <input
          id="confirm-pw"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={`${inputClass} h-11`}
        />
      </Field>
    </>
  );
}

function checkPasswords(password, confirm) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password !== confirm) return 'Passwords do not match.';
  return '';
}

function StepBar({ step, total }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm text-muted">
        Step {step} of {total}
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cx('h-1.5 flex-1 rounded-full', i < step ? 'bg-brand' : 'bg-line')} />
        ))}
      </div>
    </div>
  );
}

function pickThree() {
  const set = new Set();
  while (set.size < 3) set.add(Math.floor(Math.random() * 12));
  return [...set].sort((a, b) => a - b);
}

function CreateFlow({ onBack }) {
  const { createWallet } = useWallet();
  const [wallet] = useState(() => HDNodeWallet.createRandom());
  const words = wallet.mnemonic.phrase.split(' ');
  const [checkIdx] = useState(pickThree);

  const [step, setStep] = useState(1);
  const [shown, setShown] = useState(false);
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState(['', '', '']);
  const [verifyError, setVerifyError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = (e) => {
    e.preventDefault();
    const ok = checkIdx.every((wi, i) => answers[i].trim().toLowerCase() === words[wi]);
    if (!ok) return setVerifyError('One or more words are wrong. Check your written phrase and try again.');
    setVerifyError('');
    setStep(3);
  };

  const finish = async (e) => {
    e.preventDefault();
    const err = checkPasswords(password, confirm);
    if (err) return setPwError(err);
    setBusy(true);
    await createWallet({ kind: 'mnemonic', value: wallet.mnemonic.phrase }, password);
  };

  return (
    <div>
      <button
        type="button"
        onClick={step === 1 ? onBack : () => setStep(step - 1)}
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back
      </button>
      <StepBar step={step} total={3} />

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Write down your recovery phrase</h1>
            <p className="mt-1 text-muted">
              These 12 words are the master key to your wallet. Write them on paper, in order.
            </p>
          </div>
          <ol
            className={cx('grid grid-cols-2 gap-2 sm:grid-cols-3', !shown && 'select-none blur-sm')}
            aria-hidden={!shown}
          >
            {words.map((w, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2">
                <span className="w-5 text-right text-sm tabular-nums text-muted">{i + 1}</span>
                <span className="font-mono text-sm font-medium">{w}</span>
              </li>
            ))}
          </ol>
          <Button variant="secondary" icon={shown ? EyeOff : Eye} onClick={() => setShown(!shown)}>
            {shown ? 'Hide phrase' : 'Reveal phrase'}
          </Button>
          <Notice tone="warn">
            Anyone with this phrase can take your funds. Never share it, never type it into a
            website, and never store it in a screenshot or cloud note.
          </Notice>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="mt-0.5 size-4 accent-brand"
            />
            I have written down my recovery phrase and stored it somewhere safe.
          </label>
          <Button size="lg" className="w-full" disabled={!saved || !shown} onClick={() => setStep(2)}>
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={verify} className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Confirm your phrase</h1>
            <p className="mt-1 text-muted">Enter the words below to prove you saved them.</p>
          </div>
          {checkIdx.map((wi, i) => (
            <Field key={wi} label={`Word #${wi + 1}`} htmlFor={`w-${wi}`}>
              <input
                id={`w-${wi}`}
                value={answers[i]}
                autoComplete="off"
                autoCapitalize="none"
                onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}
                className={`${inputClass} h-11 font-mono`}
              />
            </Field>
          ))}
          {verifyError && <Notice tone="danger">{verifyError}</Notice>}
          <Button type="submit" size="lg" className="w-full" disabled={answers.some((a) => !a.trim())}>
            Confirm
          </Button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={finish} className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Set a password</h1>
            <p className="mt-1 text-muted">You will use this to unlock the wallet on this device.</p>
          </div>
          <PasswordFields
            password={password}
            setPassword={setPassword}
            confirm={confirm}
            setConfirm={setConfirm}
            error={pwError}
          />
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Create wallet
          </Button>
        </form>
      )}
    </div>
  );
}

function ImportFlow({ onBack }) {
  const { createWallet } = useWallet();
  const [kind, setKind] = useState('mnemonic');
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    let secret;
    try {
      secret = parseSecretInput(kind, input);
    } catch (err) {
      return setError(err.message);
    }
    const pe = checkPasswords(password, confirm);
    if (pe) return setPwError(pe);
    setPwError('');
    setBusy(true);
    await createWallet(secret, password);
  };

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back
      </button>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Import a wallet</h1>
          <p className="mt-1 text-muted">Restore an existing wallet using its recovery phrase or private key.</p>
        </div>

        <div className="grid grid-cols-2 rounded-md border border-line bg-white p-1" role="tablist">
          {[
            ['mnemonic', 'Recovery phrase'],
            ['privateKey', 'Private key'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              onClick={() => {
                setKind(id);
                setInput('');
                setError('');
              }}
              className={cx(
                'rounded px-3 py-2 text-sm font-medium transition-colors',
                kind === id ? 'bg-brand text-white' : 'text-muted hover:text-ink'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Field
          label={kind === 'mnemonic' ? 'Recovery phrase' : 'Private key'}
          htmlFor="secret"
          hint={kind === 'mnemonic' ? 'Separate the 12 or 24 words with spaces.' : 'A 64 character hex string.'}
          error={error}
        >
          {kind === 'mnemonic' ? (
            <textarea
              id="secret"
              rows={3}
              value={input}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => setInput(e.target.value)}
              className={`${inputClass} py-2 font-mono text-sm`}
            />
          ) : (
            <input
              id="secret"
              type="password"
              value={input}
              autoComplete="off"
              onChange={(e) => setInput(e.target.value)}
              className={`${inputClass} h-11 font-mono text-sm`}
            />
          )}
        </Field>

        <PasswordFields
          password={password}
          setPassword={setPassword}
          confirm={confirm}
          setConfirm={setConfirm}
          error={pwError}
        />
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!input.trim()}>
          Import wallet
        </Button>
      </form>
    </div>
  );
}

export default function Welcome() {
  const [mode, setMode] = useState('choose');

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-brand">
            <WalletIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-semibold">{APP_NAME}</span>
        </div>
        <div>
          <h2 className="max-w-md text-4xl font-semibold leading-tight">
            A simple wallet you control.
          </h2>
          <ul className="mt-8 space-y-5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 text-white/80">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-ink-soft">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/50">Built with React, Tailwind and ethers.js</p>
      </div>

      <div className="flex min-h-full items-center justify-center p-4 py-10 sm:p-8">
        <div className="w-full max-w-md">
          {mode === 'choose' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 lg:hidden">
                <span className="inline-flex size-10 items-center justify-center rounded-md bg-brand text-white">
                  <WalletIcon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xl font-semibold">{APP_NAME}</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold">Get started</h1>
                <p className="mt-2 text-muted">Create a new wallet or bring one you already have.</p>
              </div>
              <div className="space-y-3">
                <Button size="lg" icon={Plus} className="w-full" onClick={() => setMode('create')}>
                  Create a new wallet
                </Button>
                <Button size="lg" variant="secondary" icon={Download} className="w-full" onClick={() => setMode('import')}>
                  Import an existing wallet
                </Button>
              </div>
              <Notice tone="info">
                Wallets start on the Sepolia test network, where coins are free and have no real value.
              </Notice>
            </div>
          )}
          {mode === 'create' && <CreateFlow onBack={() => setMode('choose')} />}
          {mode === 'import' && <ImportFlow onBack={() => setMode('choose')} />}
        </div>
      </div>
    </div>
  );
}
