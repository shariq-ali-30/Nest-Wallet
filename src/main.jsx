import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { WalletProvider } from './context/WalletContext.jsx';
import { storage } from './lib/storage.js';
import { KEYS } from './lib/networks.js';

const initialTheme = storage.get(KEYS.theme, 'light');
document.documentElement.classList.toggle('dark', initialTheme === 'dark');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);
