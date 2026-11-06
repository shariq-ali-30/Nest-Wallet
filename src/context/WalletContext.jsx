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
import { fetchHistory, mergeActivity } from '../lib/history.js';

const WalletContext = createContext(null);
export const useWallet = () => useContext(WalletContext);

const AUTO_LOCK_MS = 10 * 60 * 1000;

export function WalletProvider({ children }) {
  const [vault, setVault] = useState(() => storage.get(KEYS.vault, null));
  const [signer, setSigner] = useState(null);
  const [networkId, setNetworkId] = useState(() => {
    const saved = storage.get(KEYS.network, DEFAULT_NETWORK_ID);
    return NETWORKS[saved] ? saved : DEFAULT_NETWORK_ID;
  });
  const [tokenMap, setTokenMap] = useState(() => storage.get(KEYS.tokens, {}));
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
  useEffect(() => storage.set(KEYS.localTxs, localTxs), [localTxs]);
  useEffect(() => storage.set(KEYS.tokens, tokenMap), [tokenMap]);

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
    setTokenBalances({});
    setRemoteTxs([]);
  }, [network.chainId]);

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
      setRemoteTxs(await fetchHistory({ address, chainId: network.chainId }));
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
      const secret = await decryptSecret(vault.encrypted, password);
      const wallet = walletFromSecret(secret);
      if (wallet.address !== vault.address) throw new Error('Wallet data is corrupted.');
      setSigner(wallet);
    },
    [vault]
  );

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
  const createWallet = useCallback(async (secret, password) => {
    const wallet = walletFromSecret(secret);
    const encrypted = await encryptSecret(secret, password);
    const next = { address: wallet.address, encrypted };
    storage.set(KEYS.vault, next);
    setVault(next);
    setSigner(wallet);
  }, []);

  const revealSecret = useCallback(
    (password) => decryptSecret(vault.encrypted, password),
    [vault]
  );

  const resetWallet = useCallback(() => {
    storage.remove(KEYS.vault);
    storage.remove(KEYS.tokens);
    storage.remove(KEYS.localTxs);
    setVault(null);
    setSigner(null);
    setTokenMap({});
    setLocalTxs([]);
    setRemoteTxs([]);
    setBalance(null);
  }, []);

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

  const value = {
    vault,
    address,
    unlocked,
    network,
    networks: NETWORKS,
    switchNetwork,
    balance,
    balanceError,
    tokens,
    activity,
    historyError,
    refreshing,
    refreshAll,
    unlock,
    lock,
    createWallet,
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
