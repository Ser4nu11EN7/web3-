import React, { useState } from 'react';
import { SetupView } from './components/SetupView';
import { Dashboard } from './components/Dashboard';
import { WalletBundle, SetupConfig } from './types';

const App: React.FC = () => {
  const [step, setStep] = useState<'setup' | 'dashboard'>('setup');
  const [wallets, setWallets] = useState<WalletBundle | null>(null);

  const handleSetupComplete = (config: SetupConfig, initializedWallets: any) => {
    setWallets({
      ...initializedWallets,
      contractAddress: config.contractAddress
    });
    setStep('dashboard');
  };

  return (
    <>
      {step === 'setup' && <SetupView onSetupComplete={handleSetupComplete} />}
      {step === 'dashboard' && wallets && <Dashboard wallets={wallets} />}
    </>
  );
};

export default App;