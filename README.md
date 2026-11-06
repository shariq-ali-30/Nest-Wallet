# Nest Wallet

A MetaMask-style Ethereum wallet built with React, Tailwind CSS v4 and ethers.js v6.

## Run

```bash
npm i
npm run dev
```

Open the local URL that Vite prints (usually http://localhost:5173).

## Optional setup (.env)

Copy `.env.example` to `.env` and fill what you need. Restart `npm run dev` after any change.

| Variable | Why | Where to get it |
| --- | --- | --- |
| `VITE_ETHERSCAN_API_KEY` | Full transaction history (ETH and token transfers) | Free key at https://etherscan.io/apis |
| `VITE_SEPOLIA_RPC` | Faster, more reliable Sepolia connection | Alchemy or Infura (free) |
| `VITE_MAINNET_RPC` | Same, for Ethereum Mainnet | Alchemy or Infura (free) |

The app works without any of these. Without the Etherscan key, the Activity page shows only transactions sent from this app; incoming ETH and token transfers require the key.

## Features

- Create a wallet (12-word recovery phrase, backup confirmation, password)
- Import a wallet with a recovery phrase or private key
- Password lock screen and 10 minute auto-lock
- ETH and USDC balances, auto-refreshing, with copy-address and QR code (Receive)
- Send ETH, USDC and other ERC-20 tokens with address validation, fee estimate, review step and Max button
- Built-in native USDC on Ethereum Mainnet and official test USDC on Sepolia (6 decimals)
- Transaction history with Sent / Received filter, pending and failed status, explorer links
- Add and remove ERC-20 tokens by contract address
- Switch between Sepolia Testnet and Ethereum Mainnet
- Show recovery phrase or private key (password required), remove wallet

## Getting test assets

1. Create a wallet and copy your address.
2. Search for a "Sepolia faucet", paste the address and request test ETH.
3. For Sepolia test USDC, use the official [Circle faucet](https://faucet.circle.com/).
4. Press refresh on the Wallet page after the transfers confirm.

USDC is network-specific: use the Sepolia USDC contract on Sepolia and Ethereum native USDC on Mainnet. Never send assets on the wrong network.

## Security notes

- The recovery phrase / private key is encrypted with AES-GCM (key from PBKDF2, 600,000 iterations) before it is saved in `localStorage`. It is never stored in plain text and never leaves the browser.
- This is a learning project. Use the Sepolia testnet. Do not store real funds in it.
- Never commit `.env` (already in `.gitignore`).

## Structure

```
src/
  lib/        networks, encryption, formatting, Etherscan history
  context/    WalletContext (all wallet logic: balance, send, tokens, history)
  components/ ui kit, Shell (sidebar + header), TxRow
  pages/      Welcome, Unlock, Dashboard, Send, Receive, Activity, Settings
```
