import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeProviderWrapper from '../../../styles/theme/theme-provider';
import i18n from '../../../i18n/i18n';
import { CoinDetail } from '../CoinDetail';
import type { ChainConfig } from '../../../config/chains';
import { decimalToAtomic } from '../../../utils/walletSend';

vi.mock('react-qr-code', () => ({
  default: () => null,
}));

vi.mock('../../../hooks/useMarketPrices', () => ({
  useMarketPrices: () => ({}),
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
  activeNetwork: 'MAIN',
  supportsHtlc: true,
  supportsLocalChainTrades: true,
};

function preparedResult(opts: Record<string, unknown>) {
  const amount = opts.sendMax
    ? '123456789'
    : String(decimalToAtomic(String(opts.amount), 8));

  return {
    action: 'SEND_COIN',
    amount,
    prepared: {
      activeNetwork: 'MAIN',
      amount,
      fee: '10000',
      // The Home bridge returns prepared fee rates as atomic integer strings.
      feePerByte: '20000',
      inputAmount: String(BigInt(amount) + 10000n),
      inputCount: 2,
      outputAmount: amount,
      outputCount: opts.sendMax ? 1 : 2,
      receivingAddress: opts.recipient,
      transactionSize: 225,
      txHash: 'prepared-hash',
      sendMax: Boolean(opts.sendMax),
      blockchain: 'BTC',
      currencyCode: 'BTC',
    },
    recipient: opts.recipient,
    txHash: 'prepared-hash',
    sendMax: Boolean(opts.sendMax),
  };
}

function renderDetail() {
  return render(
    <MemoryRouter>
      <ThemeProviderWrapper>
        <CoinDetail chain={btcChain} />
      </ThemeProviderWrapper>
    </MemoryRouter>
  );
}

function sendCalls(mock: ReturnType<typeof vi.fn>) {
  return mock.mock.calls
    .map(([opts]) => opts as Record<string, unknown>)
    .filter((opts) => opts.action === 'SEND_COIN');
}

async function openSendDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /^send$/i }));
  await screen.findByLabelText(/amount \(BTC\)/i);
  await waitFor(() =>
    expect(screen.getByLabelText(/optional fee per byte/i)).toHaveValue(0.0002)
  );
}

describe('CoinDetail foreign send flow', () => {
  let qdnRequestMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await i18n.changeLanguage('en');

    qdnRequestMock = vi.fn(async (opts: Record<string, unknown>) => {
      switch (opts.action) {
        case 'SHOW_ACTIONS':
          return ['SEND_COIN', 'GET_WALLET_BALANCE'];
        case 'GET_USER_WALLET':
          return { address: 'btc-wallet-address' };
        case 'GET_WALLET_BALANCE':
          return '123456789';
        case 'GET_USER_WALLET_TRANSACTIONS':
          return [];
        case 'GET_FOREIGN_FEE':
          return { fee: '0.0002' };
        case 'UNLOCK_SELECTED_ACCOUNT':
          return { isUnlocked: true };
        case 'SEND_COIN':
          return preparedResult(opts);
        default:
          return null;
      }
    });

    (globalThis as any).qdnRequest = qdnRequestMock;
  });

  afterEach(() => {
    delete (globalThis as any).qdnRequest;
  });

  it('sends fixed foreign amounts with feePerByte and renders the prepared preview', async () => {
    const user = userEvent.setup();
    renderDetail();

    await openSendDialog(user);
    await user.type(screen.getByLabelText(/amount \(BTC\)/i), '1.25');
    await user.type(
      screen.getByLabelText(/recipient address/i),
      'btc-recipient-address'
    );
    await user.click(screen.getByRole('button', { name: /confirm send/i }));

    await waitFor(() => expect(sendCalls(qdnRequestMock)).toHaveLength(1));
    const payload = sendCalls(qdnRequestMock)[0];

    expect(payload).toMatchObject({
      action: 'SEND_COIN',
      coin: 'BTC',
      recipient: 'btc-recipient-address',
      amount: '1.25',
      feePerByte: '0.0002',
    });
    expect(payload).not.toHaveProperty('fee');
    expect(payload).not.toHaveProperty('sendMax');

    expect(
      await screen.findByTestId('prepared-transaction-preview')
    ).toBeInTheDocument();
    expect(screen.getByText(/fixed amount/i)).toBeInTheDocument();
    expect(screen.getAllByText('1.25000000 BTC').length).toBeGreaterThan(0);
    expect(screen.getByText('prepared-hash')).toBeInTheDocument();
  });

  it('sends max foreign amounts without an amount field', async () => {
    const user = userEvent.setup();
    renderDetail();

    await openSendDialog(user);
    await user.click(screen.getByLabelText(/send max/i));
    expect(screen.getByLabelText(/amount \(BTC\)/i)).toBeDisabled();
    await user.type(
      screen.getByLabelText(/recipient address/i),
      'btc-recipient-address'
    );
    await user.click(screen.getByRole('button', { name: /confirm send/i }));

    await waitFor(() => expect(sendCalls(qdnRequestMock)).toHaveLength(1));
    const payload = sendCalls(qdnRequestMock)[0];

    expect(payload).toMatchObject({
      action: 'SEND_COIN',
      coin: 'BTC',
      recipient: 'btc-recipient-address',
      sendMax: true,
      feePerByte: '0.0002',
    });
    expect(payload).not.toHaveProperty('amount');
    expect(payload).not.toHaveProperty('fee');

    expect(await screen.findByText(/send max/i)).toBeInTheDocument();
    expect(screen.getAllByText('1.23456789 BTC').length).toBeGreaterThan(0);
  });

  it('blocks invalid amount, fee, and recipient values', async () => {
    const user = userEvent.setup();
    renderDetail();

    await openSendDialog(user);
    const amountInput = screen.getByLabelText(/amount \(BTC\)/i);
    const recipientInput = screen.getByLabelText(/recipient address/i);
    const feeInput = screen.getByLabelText(/optional fee per byte/i);
    const confirm = screen.getByRole('button', { name: /confirm send/i });

    await user.type(amountInput, '0');
    await user.type(recipientInput, 'btc-recipient-address');
    expect(confirm).toBeDisabled();

    await user.clear(amountInput);
    await user.type(amountInput, '1');
    await user.clear(feeInput);
    await user.type(feeInput, '0');
    expect(confirm).toBeDisabled();

    await user.clear(feeInput);
    await user.type(feeInput, '0.0002');
    fireEvent.change(recipientInput, { target: { value: 'a'.repeat(257) } });
    expect(confirm).toBeDisabled();
    expect(sendCalls(qdnRequestMock)).toHaveLength(0);
  });
});
