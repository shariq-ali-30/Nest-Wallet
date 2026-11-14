import { useWallet } from './context/WalletContext.jsx';
import Welcome from './pages/Welcome.jsx';
import Unlock from './pages/Unlock.jsx';
import Shell from './components/Shell.jsx';

export default function App() {
  const { vault, unlocked } = useWallet();
  if (!vault) return <Welcome />;
  if (!unlocked) return <Unlock />;
  return <Shell />;
}
