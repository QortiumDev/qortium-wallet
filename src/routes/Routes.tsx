import { createHashRouter, RouterProvider, useParams } from 'react-router-dom';
import { resolveStartRoute } from '../utils/startRoute';

const _startRoute = resolveStartRoute(window.location.search);
if (_startRoute) window.location.hash = _startRoute;
import { AppWrapper } from '../AppWrapper';
import { CoinGrid } from '../components/wallet/CoinGrid';
import { CoinDetail } from '../components/wallet/CoinDetail';
import { AssetDetail } from '../components/wallet/AssetDetail';
import { UnifiedHistory } from '../components/wallet/UnifiedHistory';
import { MyContactCardPage } from '../components/ContactCard/MyContactCardPage';
import { FindPersonPage } from '../components/ContactCard/FindPersonPage';
import { useSupportedChains } from '../hooks/useSupportedChains';
import type { AssetNetwork } from '../utils/Types';

function CoinDetailRouter() {
  const { coinRoute } = useParams<{ coinRoute: string }>();
  const { chains } = useSupportedChains();
  const chain = chains.find((c) => c.route === coinRoute);
  if (!chain) return null;
  return <CoinDetail chain={chain} />;
}

function AssetDetailRouter() {
  const { network, assetId } = useParams<{
    network?: string;
    assetId: string;
  }>();
  const parsed = Number(assetId);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  if (network && network !== 'qortium' && network !== 'qortal') return null;
  return (
    <AssetDetail
      assetId={parsed}
      network={(network ?? 'qortium') as AssetNetwork}
    />
  );
}

const router = createHashRouter([
  {
    path: '/',
    element: <AppWrapper />,
    children: [
      { index: true, element: <CoinGrid /> },
      { path: ':coinRoute', element: <CoinDetailRouter /> },
      { path: 'asset/:network/:assetId', element: <AssetDetailRouter /> },
      // Preserve links and saved routes created before assets were network-qualified.
      { path: 'asset/:assetId', element: <AssetDetailRouter /> },
      { path: 'history', element: <UnifiedHistory /> },
      { path: 'contacts', element: <MyContactCardPage /> },
      { path: 'contacts/find', element: <FindPersonPage /> },
    ],
  },
]);

export function Routes() {
  return <RouterProvider router={router} />;
}
