import { Box } from '@mui/material';
import { useEffect, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import walletContext, { IContextProps } from './contexts/walletContext';
import { useAuth } from 'qapp-core';
import { useIframe } from './hooks/useIframeListener';
import { TopBar } from './components/layout/TopBar';
import { tokens } from './theme/tokens';
import { useColors } from './theme/ColorTokensContext';
import { EMPTY_STRING, TIME_MINUTES_1 } from './common/constants';
import { syncAllAddressBooksOnStartup } from './utils/addressBookQDN';

export default function AppLayout() {
  useIframe();
  const c = useColors();

  const { setWalletState } = useContext(walletContext);
  const { address, avatarUrl, name } = useAuth();

  useEffect(() => {
    const session: IContextProps = {
      address: address ?? EMPTY_STRING,
      avatar: avatarUrl ?? EMPTY_STRING,
      name: name ?? EMPTY_STRING,
      isAuthenticated: !!address,
      isUsingGateway: false,
      nodeInfo: null,
    };
    if (setWalletState) setWalletState(session);
  }, [address, avatarUrl, name, setWalletState]);

  useEffect(() => {
    if (address && name) {
      syncAllAddressBooksOnStartup(name).catch(() => {});
    }
  }, [address, name]);

  // Poll node info into context
  useEffect(() => {
    const poll = async () => {
      try {
        const [nodeInfo, nodeStatus] = await Promise.all([
          qdnRequest({ action: 'GET_NODE_INFO' }),
          qdnRequest({ action: 'GET_NODE_STATUS' }),
        ]);
        const isGateway = await qdnRequest({
          action: 'IS_USING_PUBLIC_NODE',
        });
        if (setWalletState) {
          setWalletState((prev: IContextProps) => ({
            ...prev,
            isUsingGateway: isGateway,
            nodeInfo: { ...nodeInfo, ...nodeStatus },
          }));
        }
      } catch {
        /* silent */
      }
    };
    poll();
    const id = setInterval(poll, TIME_MINUTES_1);
    return () => clearInterval(id);
  }, [setWalletState]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: c.pageBg }}>
      <TopBar />
      <Box
        sx={{
          pt: `var(--wallet-top-bar-height, ${tokens.spacing.topBarHeight}px)`,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
