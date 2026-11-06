import { useEffect, useState } from 'react';
import {
  ChevronDown,
  History,
  Layers,
  Lock,
  QrCode,
  Send as SendIcon,
  Settings as SettingsIcon,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { APP_NAME } from '../lib/networks.js';
import { cx } from './ui.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Send from '../pages/Send.jsx';
import Receive from '../pages/Receive.jsx';
import Activity from '../pages/Activity.jsx';
import Settings from '../pages/Settings.jsx';

const PAGE_PATHS = {
  wallet: '/wallet',
  send: '/send',
  receive: '/receive',
  activity: '/activity',
  settings: '/settings',
};

function pageFromPath(path) {
  return Object.entries(PAGE_PATHS).find(([, route]) => route === path)?.[0] || 'wallet';
}

const NAV = [
  { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  { id: 'send', label: 'Send', icon: SendIcon },
  { id: 'receive', label: 'Receive', icon: QrCode },
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function WalletSwitcher() {
  const { wallets, activeWalletId, switchWallet, vault } = useWallet();
  const [open, setOpen] = useState(false);
  if (wallets.length < 2) return null;
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 max-w-[42vw] items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink hover:bg-canvas"
      >
        <Layers className="size-4 shrink-0" />
        <span className="truncate">{vault?.name || 'Wallet'}</span>
        <ChevronDown className="size-4 shrink-0" />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close wallet menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-64 max-w-[85vw] overflow-hidden rounded-lg border border-line bg-white shadow-lg">
            <p className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Your wallets</p>
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                onClick={() => { switchWallet(wallet.id); setOpen(false); }}
                className={cx('block w-full px-3 py-3 text-left hover:bg-canvas', wallet.id === activeWalletId && 'bg-brand-soft')}
              >
                <span className="block truncate text-sm font-medium text-ink">{wallet.name}{wallet.id === activeWalletId ? ' · Active' : ''}</span>
                <span className="block truncate font-mono text-xs text-muted">{wallet.address}</span>
              </button>
            ))}
            <p className="border-t border-line px-3 py-2 text-xs text-muted">Wallet add ya rename karne ke liye Settings kholein.</p>
          </div>
        </>
      )}
    </div>
  );
}

function NetworkSwitcher() {
  const { network, networks, switchNetwork } = useWallet();
  return (
    <div className="relative">
      <span
        className={cx(
          'pointer-events-none absolute left-3 top-1/2 size-2.5 -translate-y-1/2 rounded-full',
          network.testnet ? 'bg-warn' : 'bg-ok'
        )}
      />
      <select
        value={network.id}
        onChange={(e) => switchNetwork(e.target.value)}
        aria-label="Network"
        className="h-10 w-36 max-w-[44vw] appearance-none rounded-md border border-line bg-white pl-8 pr-9 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        {Object.values(networks).map((n) => (
          <option key={n.id} value={n.id}>
            {n.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export default function Shell() {
  const [page, setPage] = useState(() => pageFromPath(window.location.pathname));
  const { lock } = useWallet();
  const current = NAV.find((n) => n.id === page);

  const navigate = (nextPage) => {
    const nextPath = PAGE_PATHS[nextPage];
    if (!nextPath) return;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ page: nextPage }, '', nextPath);
    }
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  useEffect(() => {
    const syncPage = () => {
      const nextPage = pageFromPath(window.location.pathname);
      if (!Object.values(PAGE_PATHS).includes(window.location.pathname)) {
        window.history.replaceState({ page: 'wallet' }, '', PAGE_PATHS.wallet);
      }
      setPage(nextPage);
    };
    syncPage();
    window.addEventListener('popstate', syncPage);
    return () => window.removeEventListener('popstate', syncPage);
  }, []);

  const pages = {
    wallet: <Dashboard onNavigate={navigate} />,
    send: <Send onNavigate={navigate} />,
    receive: <Receive />,
    activity: <Activity />,
    settings: <Settings />,
  };

  return (
    <div className="min-h-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-ink text-white md:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="inline-flex size-9 items-center justify-center rounded-md bg-brand">
            <WalletIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">{APP_NAME}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Main">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              aria-current={page === id ? 'page' : undefined}
              className={cx(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                page === id ? 'bg-ink-soft text-white' : 'text-white/70 hover:bg-ink-soft hover:text-white'
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={lock}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-ink-soft hover:text-white"
          >
            <Lock className="size-5" aria-hidden="true" />
            Lock wallet
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-20 md:pb-0 md:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 md:px-8">
          <h1 className="text-lg font-semibold">{current.label}</h1>
          <div className="flex items-center gap-2">
            <WalletSwitcher />
            <NetworkSwitcher />
            <button
              type="button"
              onClick={lock}
              aria-label="Lock wallet"
              className="inline-flex size-10 items-center justify-center rounded-md border border-line text-muted hover:bg-canvas hover:text-ink md:hidden"
            >
              <Lock className="size-5" />
            </button>
          </div>
        </header>
        <main className="mx-auto min-w-0 max-w-5xl overflow-x-hidden p-4 md:p-8">{pages[page]}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white md:hidden"
        aria-label="Main"
      >
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(id)}
            aria-current={page === id ? 'page' : undefined}
            className={cx(
              'flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
              page === id ? 'text-brand' : 'text-muted'
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
