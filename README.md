# Nest Wallet

A MetaMask-style Ethereum wallet built with React, Tailwind CSS v4 and ethers.js v6.

## Run

```bash
npm i
npm run dev
```

Open the local URL that Vite prints (usually http://localhost:5173).

## Optional setup (.env.local)

Copy `.env.example` to `.env.local` and fill what you need. Restart `npm run dev` after any change. The `.env.local` file is ignored by Git.

| Variable | Why | Where to get it |
| --- | --- | --- |
| `VITE_ETHERSCAN_API_KEY` | Full transaction history (ETH and token transfers) | Free key at https://etherscan.io/apis |
| `VITE_SEPOLIA_RPC` | Faster, more reliable Sepolia connection | Alchemy or Infura (free) |
| `VITE_MAINNET_RPC` | Same, for Ethereum Mainnet | Alchemy or Infura (free) |
| `VITE_ARBITRUM_RPC` | Optional Arbitrum One RPC override | Your RPC provider |
| `VITE_BASE_RPC` | Optional Base RPC override | Your RPC provider |
| `VITE_POLYGON_RPC` | Optional Polygon PoS RPC override | Your RPC provider |

The app works without any of these. Without the Etherscan key, the Activity page shows only transactions sent from this app; incoming ETH and token transfers require the key. Etherscan history loads up to 10,000 records per history type per network on each refresh.

**API-key safety:** Vite variables prefixed with `VITE_` are included in browser JavaScript and are visible to users. Keep the key out of Git and restrict/monitor its quota in Etherscan. For a public production deployment, move Etherscan requests behind a backend proxy rather than treating a frontend key as a secret.

## Features

- Create a wallet (12-word recovery phrase, backup confirmation, password)
- Import a wallet with a recovery phrase or private key
- Password lock screen and 10 minute auto-lock
- ETH and USDC balances, auto-refreshing, with copy-address and QR code (Receive)
- Send ETH, USDC and other ERC-20 tokens with address validation, fee estimate, review step and Max button
- Built-in native USDC on Ethereum Mainnet and official test USDC on Sepolia (6 decimals)
- Transaction history with Sent / Received filter, pending and failed status, explorer links
- Add and remove ERC-20 tokens by contract address
- Switch between Sepolia, Ethereum Mainnet, Arbitrum One, Base and Polygon PoS
- Browser Back/Forward navigation with URL paths for Wallet, Send, Receive, Activity and Settings
- Save recipient addresses in a local address book and select them while sending
- Scan recipient QR codes with a supported mobile browser camera
- Estimated native ETH and built-in USDC portfolio value on supported live networks; unknown/custom token values are excluded to avoid trusting a token ticker alone
- Network gas-price tracker
- Export filtered transaction history to CSV
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
- Never commit `.env`, `.env.local`, or other local env override files (ignored by Git).

## Full history setup

1. Copy `.env.example` to `.env.local`.
2. Add your Etherscan API key to `VITE_ETHERSCAN_API_KEY`.
3. Restart the dev server with `npm run dev`.
4. Open Activity and press Refresh.

One Etherscan V2 key is accepted across supported networks; the app passes each network's chain ID to the API. Vite embeds `VITE_` values in the browser bundle, so never commit your populated `.env.local` file or assume that this key is private.

## Structure

```
src/
  lib/        networks, encryption, formatting, Etherscan history
  context/    WalletContext (all wallet logic: balance, send, tokens, history)
  components/ ui kit, Shell (sidebar + header), TxRow
  pages/      Welcome, Unlock, Dashboard, Send, Receive, Activity, Settings
```
