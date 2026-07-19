import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

const DEV_BLOCKCHAINS = [
  {
    currencyCode: 'BTC',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'LTC',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'DOGE',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'DGB',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'RVN',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'ARRR',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'BCH',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'DASH',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'NMC',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'PPC',
    walletEnabled: true,
    decimalPlaces: 6,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'FIRO',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'KMD',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'VRSC',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'ZEC',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'LBC',
    walletEnabled: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
  {
    currencyCode: 'XVG',
    walletEnabled: true,
    decimalPlaces: 6,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsQortTrades: true,
  },
];

const MOCK_ADDRESSES: Record<string, string> = {
  QORT: 'QMockTestAddress1111111111111111',
  BTC: '1MockBTCAddressXXXXXXXXXXXXXXXX',
  LTC: 'LMockLTCAddressXXXXXXXXXXXXXXXX',
  DOGE: 'DMockDOGEAddressXXXXXXXXXXXXXXX',
  DGB: 'DMockDGBAddressXXXXXXXXXXXXXXXX',
  RVN: 'RMockRVNAddressXXXXXXXXXXXXXXXX',
  ARRR: 'zsMockARRRShieldedAddressXXXXXXXXXXXXXXXXXXXXXXXXX',
  BCH: 'MockBCHAddressXXXXXXXXXXXXXXXXX',
  DASH: 'XMockDASHAddressXXXXXXXXXXXXXXX',
  NMC: 'NMockNMCAddressXXXXXXXXXXXXXXXX',
  PPC: 'PMockPPCAddressXXXXXXXXXXXXXXXX',
  FIRO: 'aMockFIROAddressXXXXXXXXXXXXXXX',
  KMD: 'RMockKMDAddressXXXXXXXXXXXXXXXX',
  VRSC: 'RMockVRSCAddressXXXXXXXXXXXXXXX',
  ZEC: 't1MockZECAddressXXXXXXXXXXXXXXX',
  LBC: 'bMockLBCAddressXXXXXXXXXXXXXXXX',
  XVG: 'DMockXVGAddressXXXXXXXXXXXXXXXX',
};

const MOCK_BALANCES: Record<string, string> = {
  QORT: '1234.56789012',
  BTC: '0.05231000',
  LTC: '12.34560000',
  DOGE: '10000.00000000',
  DGB: '5000.12300000',
  RVN: '750.00000000',
  ARRR: '25.00000000',
  BCH: '0.12345000',
  DASH: '3.45600000',
  NMC: '100.00000000',
  PPC: '50.123456',
  FIRO: '10.00000000',
  KMD: '200.00000000',
  VRSC: '150.00000000',
  ZEC: '0.50000000',
  LBC: '1000.00000000',
  XVG: '500000.000000',
};

// Raw Qortal API shape — transformed by CoinDetail's fetchTransactions for native chains
const MOCK_QORT_TXS = [
  {
    signature:
      'aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344aabb',
    amount: '50.00000000',
    fee: '0.01000000',
    timestamp: Date.now() - 3_600_000,
    recipient: MOCK_ADDRESSES.QORT,
    creatorAddress: 'QExternalSender2222222222222222',
  },
  {
    signature:
      'bbccddee22334455bbccddee22334455bbccddee22334455bbccddee22334455bbcc',
    amount: '25.50000000',
    fee: '0.01000000',
    timestamp: Date.now() - 86_400_000 * 2,
    recipient: 'QExternalRecipient333333333333',
    creatorAddress: MOCK_ADDRESSES.QORT,
  },
  {
    signature:
      'ccddee ff33445566ccddee ff33445566ccddee ff33445566ccddee ff33445566cc',
    amount: '200.00000000',
    fee: '0.01000000',
    timestamp: Date.now() - 86_400_000 * 5,
    recipient: MOCK_ADDRESSES.QORT,
    creatorAddress: 'QAnotherSender4444444444444444',
  },
  {
    signature:
      'ddeeff0044556677ddeeff0044556677ddeeff0044556677ddeeff0044556677ddee',
    amount: '10.00000000',
    fee: '0.01000000',
    timestamp: Date.now() - 86_400_000 * 9,
    recipient: 'QSomeOtherRecipient55555555555',
    creatorAddress: MOCK_ADDRESSES.QORT,
  },
];

// TxRow shape — used directly for foreign chains
const MOCK_FOREIGN_TXS = [
  {
    txHash:
      'aaabbbccc111222333aaabbbccc111222333aaabbbccc111222333aaabbbccc111222',
    totalAmount: 100000000,
    feeAmount: 10000,
    timestamp: Date.now() - 3_600_000 * 3,
    sender: 'ExternalSender1111111111111111',
    recipient: 'MockWalletAddress',
  },
  {
    txHash:
      'bbbcccddd222333444bbbcccddd222333444bbbcccddd222333444bbbcccddd222333',
    totalAmount: -50000000,
    feeAmount: 10000,
    timestamp: Date.now() - 86_400_000 * 1,
    sender: 'MockWalletAddress',
    recipient: 'ExternalRecipient222222222222',
  },
  {
    txHash:
      'cccdddeee333444555cccdddeee333444555cccdddeee333444555cccdddeee333444',
    totalAmount: 250000000,
    feeAmount: 10000,
    timestamp: Date.now() - 86_400_000 * 4,
    sender: 'ExternalSender3333333333333333',
    recipient: 'MockWalletAddress',
  },
  {
    txHash:
      'dddeeefffdddeeefffdddeeefffdddeeefffdddeeefffdddeeefffdddeeefffdddeee',
    totalAmount: -30000000,
    feeAmount: 10000,
    timestamp: Date.now() - 86_400_000 * 8,
    sender: 'MockWalletAddress',
    recipient: 'ExternalRecipient444444444444',
  },
];

const MOCK_SCRIPT = `
(function () {
  var BLOCKCHAINS   = ${JSON.stringify(DEV_BLOCKCHAINS)};
  var ADDRESSES     = ${JSON.stringify(MOCK_ADDRESSES)};
  var BALANCES      = ${JSON.stringify(MOCK_BALANCES)};
  var QORT_TXS      = ${JSON.stringify(MOCK_QORT_TXS)};
  var FOREIGN_TXS   = ${JSON.stringify(MOCK_FOREIGN_TXS)};
  var NOTIFICATION_RULES = [];

  // Reset persisted zoom so the demo always starts at a clean showcase level
  localStorage.setItem('qw-tile-zoom', '5');

  // Intercept fetch so the demo works as a static file (no dev server needed)
  var _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    if (url === '/crosschain/blockchains')
      return Promise.resolve(new Response(JSON.stringify(BLOCKCHAINS), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    if (url.startsWith('/addresses/balance/'))
      return Promise.resolve(new Response('1234.56789012', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    if (url.startsWith('/transactions/search'))
      return Promise.resolve(new Response(JSON.stringify(QORT_TXS), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    return _fetch(input, init);
  };

  window.qortalRequest = function (opts) {
    function decimalToAtomic(value, places) {
      var raw = String(value || '0');
      var parts = raw.split('.');
      var whole = parts[0] || '0';
      var fraction = (parts[1] || '').padEnd(places, '0').slice(0, places);
      return String(BigInt(whole + fraction));
    }

    function preparedSend(opts) {
      var coin = opts.coin || 'QORT';
      var meta = BLOCKCHAINS.find(function (b) { return b.currencyCode === coin; }) || { activeNetwork: 'MAIN', decimalPlaces: 8 };
      var amount = opts.sendMax ? '123456789' : decimalToAtomic(opts.amount, meta.decimalPlaces);
      var fee = '10000';
      return {
        action: 'SEND_COIN',
        amount: amount,
        prepared: {
          activeNetwork: meta.activeNetwork,
          amount: amount,
          fee: fee,
          feePerByte: decimalToAtomic(String(opts.feePerByte || opts.fee || '0.0001'), meta.decimalPlaces),
          inputAmount: String(BigInt(amount) + BigInt(fee)),
          inputCount: 2,
          outputAmount: amount,
          outputCount: opts.sendMax ? 1 : 2,
          receivingAddress: opts.recipient,
          transactionSize: 225,
          txHash: 'dev-prepared-tx-hash-' + coin.toLowerCase(),
          sendMax: !!opts.sendMax,
          blockchain: coin,
          currencyCode: coin
        },
        recipient: opts.recipient,
        txHash: 'dev-prepared-tx-hash-' + coin.toLowerCase(),
        result: { success: true },
        sendMax: !!opts.sendMax
      };
    }

    return new Promise(function (resolve) {
      setTimeout(function () {
        var a = opts.action, c = opts.coin || '';
        if      (a === 'SHOW_ACTIONS')                   resolve(['NOTIFICATION_ADD', 'NOTIFICATION_GET', 'NOTIFICATION_REMOVE']);
        else if (a === 'GET_SELECTED_ACCOUNT')           resolve({ address: ADDRESSES.QORT, isUnlocked: true });
        else if (a === 'GET_CROSSCHAIN_BLOCKCHAINS')     resolve(BLOCKCHAINS);
        else if (a === 'GET_USER_WALLET')                resolve({ address: ADDRESSES[c] || ('mock_' + c), publicKey: 'xpub-mock-' + c });
        else if (a === 'GET_WALLET_BALANCE')             resolve(BALANCES[c] || '0');
        else if (a === 'GET_QORT_BALANCE')               resolve(BALANCES.QORT);
        else if (a === 'GET_USER_WALLET_TRANSACTIONS')   resolve(FOREIGN_TXS);
        else if (a === 'GET_FOREIGN_FEE')                resolve({ fee: 0.0001 });
        else if (a === 'GET_ARRR_SYNC_STATUS')           resolve('Synchronized');
        else if (a === 'GET_CROSSCHAIN_SERVER_INFO')     resolve([{ hostName: 'lightwalletd.pirate.black', port: 443, connectionType: 'SSL' }]);
        else if (a === 'SET_CURRENT_FOREIGN_SERVER')     resolve({ success: true });
        else if (a === 'NOTIFICATION_GET')               resolve(NOTIFICATION_RULES);
        else if (a === 'NOTIFICATION_ADD')               { NOTIFICATION_RULES = opts.subscriptions || []; resolve(NOTIFICATION_RULES); }
        else if (a === 'NOTIFICATION_REMOVE')            { NOTIFICATION_RULES = []; resolve([]); }
        else if (a === 'SEND_COIN')                      resolve(preparedSend(opts));
        else resolve(null);
      }, 350);
    });
  };

  // Wallet uses the Qortium Home bridge name; qapp-core still calls the legacy
  // alias internally, so expose both in the standalone preview.
  window.qdnRequest = window.qortalRequest;

  console.info('[dev-mock] fetch + qortalRequest installed');
})();
`;

function devMockPlugin(
  applyTo: 'serve' | 'build' | 'always' = 'serve'
): Plugin {
  return {
    name: 'dev-mock',
    apply: applyTo === 'always' ? undefined : applyTo,

    transformIndexHtml() {
      return [{ tag: 'script', children: MOCK_SCRIPT, injectTo: 'head' }];
    },

    // Backup middleware for direct URL access during dev (fetch override takes priority in browser)
    configureServer(server) {
      const json = (res: ServerResponse, data: unknown) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };
      server.middlewares.use(
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = req.url ?? '';
          if (url === '/crosschain/blockchains')
            return json(res, DEV_BLOCKCHAINS);
          if (url.startsWith('/addresses/balance/'))
            return json(res, 1234.56789012);
          if (url.startsWith('/transactions/search'))
            return json(res, MOCK_QORT_TXS);
          next();
        }
      );
    },
  };
}

const isDemo = process.env.VITE_MODE === 'demo';

export default defineConfig({
  plugins: [
    react(),
    devMockPlugin(isDemo ? 'always' : 'serve'),
    viteSingleFile(),
  ],
  base: './',
  build: {
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
  },
});
