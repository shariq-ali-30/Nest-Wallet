import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../context/WalletContext.jsx';
import { Card, CopyButton, Notice } from '../components/ui.jsx';

export default function Receive() {
  const { address, network } = useWallet();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="p-6 text-center">
        <p className="mb-5 text-muted">Scan this code or share your address to receive funds.</p>
        <div className="mx-auto inline-block rounded-md border border-line bg-white p-4">
          <QRCodeSVG value={address} size={196} level="M" />
        </div>
        <div className="mt-5 flex items-start justify-between gap-2 rounded-md bg-canvas p-3 text-left">
          <p className="break-all font-mono text-sm">{address}</p>
          <CopyButton text={address} label="Copy address" />
        </div>
      </Card>
      <Notice tone={network.testnet ? 'info' : 'warn'}>
        {network.testnet
          ? `You are on ${network.name}. You can receive test ETH and Sepolia USDC here. Mainnet USDC sent to Sepolia will not appear in this wallet network.`
          : `Only send ETH and ERC-20 tokens such as USDC on ${network.name} to this address. Assets sent on another network may be lost.`}
      </Notice>
    </div>
  );
}
