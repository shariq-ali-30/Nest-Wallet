import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Contract,
  JsonRpcProvider,
  Network,
  getAddress,
  isAddress,
  parseUnits,
} from 'ethers';
import { DEFAULT_NETWORK_ID, DEFAULT_TOKENS, ERC20_ABI, KEYS, NETWORKS } from '../lib/networks.js';
import { storage } from '../lib/storage.js';
import { decryptSecret, encryptSecret } from '../lib/crypto.js';
import { walletFromSecret } from '../lib/wallet.js';
import { createBiometricCredential, decryptBiometricPassword } from '../lib/biometric.js';
import { fetchHistory, mergeActivity } from '../lib/history.js';

const WalletContext = createContext(null);
export const useWallet = () => useContext(WalletContext);

const AUTO_LOCK_MS = 10 * 60 * 1000;

function readWallets() {
  const saved = storage.get(KEYS.wallets, null);
  if (Array.isArray(saved)) return saved;
  const legacy = storage.get(KEYS.vault, null);
  if (!legacy?.address || !legacy?.encrypted) return [];
  const migrated = [{
    id: 'wallet-' + legacy.address.toLowerCase(),
    name: legacy.name || 'Main Wallet',
    address: legacy.address,
    encrypted: legacy.encrypted,
  }];
  storage.set(KEYS.wallets, migrated);
  storage.set(KEYS.activeWallet, migrated[0].id);
  storage.remove(KEYS.vault);
  return migrated;
}

function newWalletId(address) {
  return globalThis.crypto?.randomUUID?.() || 'wallet-' + address.toLowerCase() + '-' + Date.now();
}

export function WalletProvider({ children }) {
  const [wallets, setWallets] = useState(readWallets);
  const [activeWalletId, setActiveWalletId] = useState(() => {
    const savedId = storage.get(KEYS.activeWallet, '');
    const list = storage.get(KEYS.wallets, []);
    return savedId || list[0]?.id || '';
  });
  const vault = wallets.find((wallet) => wallet.id === activeWalletId) || wallets[0] || null;
  const [theme, setThemeState] = useState(() => storage.get(KEYS.theme, 'light') === 'dark' ? 'dark' : 'light');
  const [signer, setSigner] = useState(null);
  const [networkId, setNetworkId] = useState(() => {
    const saved = storage.get(KEYS.network, DEFAULT_NETWORK_ID);
    return NETWORKS[saved] ? saved : DEFAULT_NETWORK_ID;
  });
  const [tokenMap, setTokenMap] = useState(() => storage.get(KEYS.tokens, {}));
  const [contacts, setContacts] = useState(() => storage.get(KEYS.contacts, []));
  const [localTxs, setLocalTxs] = useState(() => storage.get(KEYS.localTxs, []));
  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState(null);
  const [tokenBalances, setTokenBalances] = useState({});
  const [remoteTxs, setRemoteTxs] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const network = NETWORKS[networkId];
  const address = vault?.address ?? null;
  const unlocked = Boolean(signer);
  const setTheme = useCallback((nextTheme) => setThemeState(nextTheme === 'dark' ? 'dark' : 'light'), []);

  const provider = useMemo(
    () =>
      new JsonRpcProvider(network.rpc, network.chainId, {
        staticNetwork: Network.from(network.chainId),
      }),
    [network]
  );

  const savedTokens = useMemo(() => {
    const defaults = DEFAULT_TOKENS[network.chainId] ?? [];
    const custom = tokenMap[network.chainId] ?? [];
    const defaultAddresses = new Set(defaults.map((token) => token.address.toLowerCase()));
    return [...defaults, ...custom.filter((token) => !defaultAddresses.has(token.address.toLowerCase()))];
  }, [tokenMap, network.chainId]);

  const tokens = useMemo(
    () => savedTokens.map((t) => ({ ...t, balance: tokenBalances[t.address] ?? null })),
    [savedTokens, tokenBalances]
  );

  /* ---------- persistence ---------- */
  useEffect(() => storage.set(KEYS.wallets, wallets), [wallets]);
  useEffect(() => {
    if (activeWalletId) storage.set(KEYS.activeWallet, activeWalletId);
    else storage.remove(KEYS.activeWallet);
  }, [activeWalletId]);
  useEffect(() => {
    if (wallets.length && !wallets.some((wallet) => wallet.id === activeWalletId)) {
      setActiveWalletId(wallets[0].id);
    }
  }, [wallets, activeWalletId]);
  useEffect(() => {
    storage.set(KEYS.theme, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  useEffect(() => storage.set(KEYS.localTxs, localTxs), [localTxs]);
  useEffect(() => storage.set(KEYS.tokens, tokenMap), [tokenMap]);
  useEffect(() => storage.set(KEYS.contacts, contacts), [contacts]);

  /* ---------- balances ---------- */
  const loadBalances = useCallback(async () => {
    if (!address) return;
    try {
      setBalance(await provider.getBalance(address));
      setBalanceError(null);
    } catch {
      setBalanceError(`Could not reach ${network.name}. Check your internet connection.`);
    }
    const entries = await Promise.all(
      savedTokens.map(async (t) => {
        try {
          const c = new Contract(t.address, ERC20_ABI, provider);
          return [t.address, await c.balanceOf(address)];
        } catch {
          return [t.address, null];
        }
      })
    );
    setTokenBalances(Object.fromEntries(entries));
  }, [address, provider, savedTokens, network.name]);

  useEffect(() => {
    setBalance(null);
    setBalanceError(null);
    setTokenBalances({});
    setRemoteTxs([]);
    setHistoryError(null);
  }, [network.chainId, address]);

  useEffect(() => {
    if (!unlocked) return undefined;
    loadBalances();
    const id = setInterval(loadBalances, 20000);
    return () => clearInterval(id);
  }, [unlocked, loadBalances]);

  /* ---------- history ---------- */
  const loadHistory = useCallback(async () => {
    if (!address) return;
    try {
      setRemoteTxs(await fetchHistory({ address, chainId: network.chainId, nativeSymbol: network.symbol }));
      setHistoryError(null);
    } catch (e) {
      setHistoryError(e.message || 'Could not load history.');
    }
  }, [address, network.chainId]);

  useEffect(() => {
    if (unlocked) loadHistory();
  }, [unlocked, loadHistory]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadBalances(), loadHistory()]);
    setRefreshing(false);
  }, [loadBalances, loadHistory]);

  const activity = useMemo(
    () =>
      mergeActivity(
        localTxs.filter(
          (t) =>
            t.chainId === network.chainId &&
            Boolean(address) &&
            (t.from?.toLowerCase() === address.toLowerCase() ||
              t.to?.toLowerCase() === address.toLowerCase())
        ),
        remoteTxs
      ),
    [localTxs, remoteTxs, network.chainId, address]
  );

  /* ---------- lock / unlock ---------- */
  const lock = useCallback(() => setSigner(null), []);

  const unlock = useCallback(
    async (password) => {
      if (!vault) throw new Error('No wallet is selected.');
      const secret = await decryptSecret(vault.encrypted, password);
      const wallet = walletFromSecret(secret);
      if (wallet.address.toLowerCase() !== vault.address.toLowerCase()) {
        throw new Error('Wallet data is corrupted.');
      }
      setSigner(wallet);
    },
    [vault]
  );

  const unlockWithBiometric = useCallback(async () => {
    if (!vault?.biometric) throw new Error('Is wallet ke liye biometric unlock set up nahi hai.');
    const password = await decryptBiometricPassword(vault.biometric);
    await unlock(password);
  }, [vault, unlock]);

  const enableBiometric = useCallback(async (password) => {
    if (!vault) throw new Error('No wallet is selected.');
    await decryptSecret(vault.encrypted, password);
    const credential = await createBiometricCredential({
      password,
      address: vault.address,
      name: vault.name || 'Wallet',
    });
    setWallets((previous) => previous.map((item) =>
      item.id === vault.id ? { ...item, biometric: credential } : item
    ));
  }, [vault]);

  const disableBiometric = useCallback(async (password) => {
    if (!vault) throw new Error('No wallet is selected.');
    await decryptSecret(vault.encrypted, password);
    setWallets((previous) => previous.map((item) => {
      if (item.id !== vault.id) return item;
      const { biometric, ...rest } = item;
      return rest;
    }));
  }, [vault]);

  const switchWallet = useCallback((walletId) => {
    if (!wallets.some((item) => item.id === walletId) || walletId === activeWalletId) return;
    setSigner(null);
    setActiveWalletId(walletId);
  }, [wallets, activeWalletId]);

  const renameWallet = useCallback((walletId, name) => {
    const cleanName = String(name || '').trim().slice(0, 32);
    if (!cleanName) throw new Error('Wallet name khali nahi ho sakta.');
    setWallets((previous) => previous.map((item) =>
      item.id === walletId ? { ...item, name: cleanName } : item
    ));
  }, []);

  const lockTimer = useRef(null);
  useEffect(() => {
    if (!unlocked) return undefined;
    const reset = () => {
      clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(lock, AUTO_LOCK_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(lockTimer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [unlocked, lock]);

  /* ---------- wallet lifecycle ---------- */
  const createWallet = useCallback(async (secret, password, name) => {
    const wallet = walletFromSecret(secret);
    if (wallets.some((item) => item.address.toLowerCase() === wallet.address.toLowerCase())) {
      throw new Error('Ye wallet pehle se is device par maujood hai. Wallet switcher se select karein.');
    }
    const encrypted = await encryptSecret(secret, password);
    const id = newWalletId(wallet.address);
    const next = {
      id,
      name: String(name || 'Wallet ' + (wallets.length + 1)).trim().slice(0, 32) || 'Wallet ' + (wallets.length + 1),
      address: wallet.address,
      encrypted,
    };
    setWallets((previous) => [...previous, next]);
    setActiveWalletId(id);
    setSigner(wallet);
  }, [wallets]);

  const revealSecret = useCallback(
    (password) => decryptSecret(vault.encrypted, password),
    [vault]
  );

  const resetWallet = useCallback(() => {
    if (!vault) return;
    const remaining = wallets.filter((item) => item.id !== vault.id);
    setSigner(null);
    setWallets(remaining);
    setActiveWalletId(remaining[0]?.id || '');
    setRemoteTxs([]);
    setBalance(null);
    setTokenBalances({});
    setBalanceError(null);
  }, [vault, wallets]);

  const switchNetwork = useCallback((id) => {
    if (!NETWORKS[id]) return;
    storage.set(KEYS.network, id);
    setNetworkId(id);
  }, []);

  /* ---------- tokens ---------- */
  const lookupToken = useCallback(
    async (input) => {
      if (!isAddress(input.trim())) throw new Error('Enter a valid contract address.');
      const addr = getAddress(input.trim());
      try {
        const c = new Contract(addr, ERC20_ABI, provider);
        const [name, symbol, decimals] = await Promise.all([c.name(), c.symbol(), c.decimals()]);
        return { address: addr, name, symbol, decimals: Number(decimals) };
      } catch {
        throw new Error(`This address is not a token contract on ${network.name}.`);
      }
    },
    [provider, network.name]
  );

  const addToken = useCallback(
    (token) => {
      setTokenMap((prev) => {
        const defaults = DEFAULT_TOKENS[network.chainId] ?? [];
        const list = prev[network.chainId] ?? [];
        if (
          defaults.some((t) => t.address.toLowerCase() === token.address.toLowerCase()) ||
          list.some((t) => t.address.toLowerCase() === token.address.toLowerCase())
        ) return prev;
        return { ...prev, [network.chainId]: [...list, token] };
      });
    },
    [network.chainId]
  );

  const removeToken = useCallback(
    (tokenAddress) => {
      setTokenMap((prev) => ({
        ...prev,
        [network.chainId]: (prev[network.chainId] ?? []).filter((t) => t.address !== tokenAddress),
      }));
    },
    [network.chainId]
  );

  const addContact = useCallback(({ name, address: contactAddress }) => {
    const cleanName = String(name || '').trim();
    const cleanAddress = String(contactAddress || '').trim();
    if (!cleanName) throw new Error('Enter a name for this address.');
    if (!isAddress(cleanAddress)) throw new Error('Enter a valid Ethereum address.');
    const contact = { id: cleanAddress.toLowerCase(), name: cleanName, address: getAddress(cleanAddress) };
    setContacts((prev) => [
      contact,
      ...prev.filter((item) => item.address.toLowerCase() !== contact.id),
    ].slice(0, 100));
  }, []);

  const removeContact = useCallback((contactAddress) => {
    setContacts((prev) => prev.filter(
      (item) => item.address.toLowerCase() !== String(contactAddress).toLowerCase()
    ));
  }, []);

  /* ---------- sending ---------- */
  const getFeePerGas = useCallback(async () => {
    const fd = await provider.getFeeData();
    return fd.maxFeePerGas ?? fd.gasPrice ?? 0n;
  }, [provider]);

  const estimateSend = useCallback(
    async ({ asset, to, amount }) => {
      const value = parseUnits(amount, asset.decimals);
      let gasLimit;
      if (asset.kind === 'eth') {
        gasLimit = await provider.estimateGas({ from: address, to, value });
      } else {
        const c = new Contract(asset.address, ERC20_ABI, provider);
        gasLimit = await c.transfer.estimateGas(to, value, { from: address });
      }
      const perGas = await getFeePerGas();
      return { value, gasLimit, perGas, fee: gasLimit * perGas };
    },
    [provider, address, getFeePerGas]
  );

  const updateLocalTx = useCallback((hash, patch) => {
    setLocalTxs((prev) => prev.map((t) => (t.hash === hash ? { ...t, ...patch } : t)));
  }, []);

  const sendAsset = useCallback(
    async ({ asset, to, value }) => {
      const connected = signer.connect(provider);
      const tx =
        asset.kind === 'eth'
          ? await connected.sendTransaction({ to, value })
          : await new Contract(asset.address, ERC20_ABI, connected).transfer(to, value);

      const record = {
        hash: tx.hash,
        from: address,
        to,
        value: value.toString(),
        kind: asset.kind,
        contractAddress: asset.kind === 'token' ? asset.address : null,
        symbol: asset.symbol,
        decimals: asset.decimals,
        chainId: network.chainId,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending',
        isCall: false,
      };
      setLocalTxs((prev) => [record, ...prev].slice(0, 100));

      tx.wait()
        .then((receipt) => {
          updateLocalTx(tx.hash, { status: receipt?.status === 1 ? 'success' : 'failed' });
          loadBalances();
          setTimeout(loadHistory, 8000);
        })
        .catch(() => updateLocalTx(tx.hash, { status: 'failed' }));

      return tx;
    },
    [signer, provider, address, network.chainId, updateLocalTx, loadBalances, loadHistory]
  );

  const walletList = useMemo(
    () => wallets.map(({ id, name, address: walletAddress, biometric }) => ({
      id,
      name: name || 'Wallet',
      address: walletAddress,
      hasBiometric: Boolean(biometric),
    })),
    [wallets]
  );

  const value = {
    vault: vault ? {
      id: vault.id,
      name: vault.name || 'Wallet',
      address: vault.address,
      hasBiometric: Boolean(vault.biometric),
    } : null,
    wallets: walletList,
    activeWalletId,
    switchWallet,
    renameWallet,
    theme,
    setTheme,
    address,
    unlocked,
    network,
    networks: NETWORKS,
    switchNetwork,
    balance,
    balanceError,
    tokens,
    contacts,
    addContact,
    removeContact,
    activity,
    historyError,
    refreshing,
    refreshAll,
    unlock,
    unlockWithBiometric,
    enableBiometric,
    disableBiometric,
    lock,
    createWallet,
    addWallet: createWallet,
    revealSecret,
    resetWallet,
    lookupToken,
    addToken,
    removeToken,
    estimateSend,
    getFeePerGas,
    sendAsset,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
