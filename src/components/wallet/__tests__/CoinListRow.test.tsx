import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeProviderWrapper from '../../../styles/theme/theme-provider';
import type { ChainConfig } from '../../../config/chains';
import { CoinListRow } from '../CoinListRow';

vi.mock('../../../hooks/useCoinImageUrl', () => ({
  useCoinImageUrl: () => null,
}));

const btcChain: ChainConfig = {
  key: 'BTC',
  name: 'Bitcoin',
  ticker: 'BTC',
  coinEnum: 'BTC',
  route: 'bitcoin',
  defaultFee: 0.00001,
  isNative: false,
  decimalPlaces: 8,
  activeNetwork: 'TEST3',
  supportsHtlc: true,
  supportsLocalChainTrades: true,
};

const writeTextMock = vi.fn();

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">{location.pathname + location.search}</div>
  );
}

function renderRow(
  overrides: Partial<React.ComponentProps<typeof CoinListRow>> = {}
) {
  return render(
    <MemoryRouter>
      <ThemeProviderWrapper>
        <CoinListRow
          chain={btcChain}
          balance="1.25"
          canSend
          loading={false}
          fiatDisplay="$75,000.00"
          dragHandleProps={{ tabIndex: 0 }}
          {...overrides}
        />
        <LocationProbe />
      </ThemeProviderWrapper>
    </MemoryRouter>
  );
}

describe('CoinListRow', () => {
  beforeEach(() => {
    (globalThis as any).qdnRequest = vi.fn(async () => ({
      address: 'btc-wallet-address',
    }));
    writeTextMock.mockReset();
    writeTextMock.mockResolvedValue(undefined);
  });

  it('shows wallet identity, balances, network, and accessible actions', () => {
    renderRow();

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('test3')).toBeInTheDocument();
    expect(screen.getByText('1.25')).toBeInTheDocument();
    expect(screen.getByText('$75,000.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'reorder BTC' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'copy BTC address' })
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'send BTC' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'open BTC wallet' })
    ).toBeVisible();
  });

  it('fetches and copies the address without requiring hover', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    renderRow();

    await user.click(screen.getByRole('button', { name: 'copy BTC address' }));

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith('btc-wallet-address')
    );
    expect(globalThis.qdnRequest).toHaveBeenCalledWith({
      action: 'GET_USER_WALLET',
      coin: 'BTC',
    });
  });

  it('opens the detail and send routes from always-visible actions', async () => {
    const user = userEvent.setup();
    const { rerender } = renderRow();

    await user.click(screen.getByRole('button', { name: 'open BTC wallet' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/bitcoin');

    rerender(
      <MemoryRouter>
        <ThemeProviderWrapper>
          <CoinListRow
            chain={btcChain}
            balance="1.25"
            canSend
            loading={false}
          />
          <LocationProbe />
        </ThemeProviderWrapper>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'send BTC' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/bitcoin?send=true'
    );
  });

  it('removes the reorder control outside custom sorting', () => {
    renderRow({ dragHandleProps: undefined });
    expect(
      screen.queryByRole('button', { name: 'reorder BTC' })
    ).not.toBeInTheDocument();
  });
});
