import { GlobalProvider } from 'qapp-core';
import { publicSalt } from './qapp-config';
import AppLayout from './AppLayout';
import { TIME_MINUTES_3 } from './common/constants';

export const AppWrapper = () => {
  return (
    <GlobalProvider
      config={{
        appName: 'Walletium',
        auth: {
          balanceSetting: {
            interval: TIME_MINUTES_3,
            onlyOnMount: false,
          },
          authenticateOnMount: true,
        },
        publicSalt: publicSalt,
      }}
    >
      <main>
        <AppLayout />
      </main>
    </GlobalProvider>
  );
};
