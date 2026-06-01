import { createHashRouter, RouterProvider, useParams } from 'react-router-dom';
import { AppWrapper } from '../AppWrapper';
import { CoinGrid } from '../components/wallet/CoinGrid';
import { CoinDetail } from '../components/wallet/CoinDetail';
import { useSupportedChains } from '../hooks/useSupportedChains';

function CoinDetailRouter() {
  const { coinRoute } = useParams<{ coinRoute: string }>();
  const chains = useSupportedChains();
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
    ],
  },
]);

export function Routes() {
  return <RouterProvider router={router} />;
}
