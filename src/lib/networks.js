export const APP_NAME = 'Nest Wallet';

export const NETWORKS = {
  sepolia: {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpc: import.meta.env.VITE_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    symbol: 'ETH',
    testnet: true,
  },
  mainnet: {
    id: 'mainnet',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpc: import.meta.env.VITE_MAINNET_RPC || 'https://ethereum-rpc.publicnode.com',
    explorer: 'https://etherscan.io',
    symbol: 'ETH',
    testnet: false,
  },
};

export const DEFAULT_NETWORK_ID = 'sepolia';

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export const KEYS = {
  vault: 'nest.vault',
  network: 'nest.network',
  tokens: 'nest.tokens',
  localTxs: 'nest.localTxs',
};
