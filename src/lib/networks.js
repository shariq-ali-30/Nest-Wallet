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

// Official Circle USDC contracts for Ethereum Mainnet and Sepolia.
// Sepolia USDC is testnet-only and has no real monetary value.
export const DEFAULT_TOKENS = {
  1: [
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      isDefault: true,
    },
  ],
  11155111: [
    {
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      name: 'USD Coin (Sepolia)',
      symbol: 'USDC',
      decimals: 6,
      isDefault: true,
    },
  ],
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
