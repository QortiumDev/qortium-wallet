import { createHashRouter, RouterProvider, useParams } from 'react-router-dom';

const _startRoute = new URLSearchParams(window.location.search).get('_route');
if (_startRoute) window.location.hash = _startRoute;
import { AppWrapper } from '../AppWrapper';
import { CoinGrid } from '../components/wallet/CoinGrid';
import { CoinDetail } from '../components/wallet/CoinDetail';
import { UnifiedHistory } from '../components/wallet/UnifiedHistory';
import { ContactCard } from '../components/wallet/ContactCard';
import { useSupportedChains } from '../hooks/useSupportedChains';

function CoinDetailRouter() {
  const { coinRoute } = useParams<{ coinRoute: string }>();
  const { chains } = useSupportedChains();
  const chain = chains.find((c) => c.route === coinRoute);
  if (!chain) return null;
  return <CoinDetail chain={chain} />;
}

const router = createHashRouter([
  {
    path: '/',
    element: <AppWrapper />,
    children: [
      { index: true, element: <CoinGrid /> },
      { path: ':coinRoute', element: <CoinDetailRouter /> },
      { path: 'history', element: <UnifiedHistory /> },
      { path: 'contact/:qortName', element: <ContactCard /> },
    ],
  },
]);

export function Routes() {
  return <RouterProvider router={router} />;
}
