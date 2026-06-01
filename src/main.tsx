import { StrictMode, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import ThemeProviderWrapper from './styles/theme/theme-provider.tsx';
import './index.css';
import { Routes } from './routes/Routes.tsx';
import WalletContext, { defaultState } from './contexts/walletContext.ts';

type WalletProviderProps = { children: ReactNode };

function WalletProvider({ children }: WalletProviderProps) {
  const [walletState, setWalletState] = useState(defaultState);

  return (
    <WalletContext.Provider value={{ ...walletState, setWalletState }}>
      {children}
    </WalletContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProviderWrapper>
      <WalletProvider>
        <Routes />
      </WalletProvider>
    </ThemeProviderWrapper>
  </StrictMode>
);
