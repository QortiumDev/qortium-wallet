export interface ChainConfig {
  key: string;
  name: string;
  ticker: string;
  coinEnum: string;
  route: string;
  defaultFee: number;
  isNative: boolean;
  decimalPlaces: number;
  activeNetwork: 'MAIN' | 'TEST3' | 'TEST4' | 'REGTEST';
  supportsHtlc: boolean;
  supportsLocalChainTrades: boolean;
}

// Shown when /crosschain/blockchains is unavailable (fallback for non-Qortium nodes)
// defaultFee: display/native-send fallback in whole coin units. Foreign sends
// only pass fee-per-byte values returned by GET_FOREIGN_FEE.
export const DEFAULT_CHAINS: ChainConfig[] = [
  {
    key: 'QORT',
    name: 'Qortal',
    ticker: 'QORT',
    coinEnum: 'QORT',
    route: 'qortal',
    defaultFee: 0.01,
    isNative: true,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: false,
    supportsLocalChainTrades: false,
  },
  {
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
  },
  {
    key: 'LTC',
    name: 'Litecoin',
    ticker: 'LTC',
    coinEnum: 'LTC',
    route: 'litecoin',
    defaultFee: 0.001,
    isNative: false,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsLocalChainTrades: true,
  },
  {
    key: 'DOGE',
    name: 'Dogecoin',
    ticker: 'DOGE',
    coinEnum: 'DOGE',
    route: 'dogecoin',
    defaultFee: 1.0,
    isNative: false,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsLocalChainTrades: true,
  },
  {
    key: 'DGB',
    name: 'DigiByte',
    ticker: 'DGB',
    coinEnum: 'DGB',
    route: 'digibyte',
    defaultFee: 0.001,
    isNative: false,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsLocalChainTrades: true,
  },
  {
    key: 'RVN',
    name: 'Ravencoin',
    ticker: 'RVN',
    coinEnum: 'RVN',
    route: 'ravencoin',
    defaultFee: 0.01,
    isNative: false,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsLocalChainTrades: true,
  },
  {
    key: 'DASH',
    name: 'Dash',
    ticker: 'DASH',
    coinEnum: 'DASH',
    route: 'dash',
    defaultFee: 0.0001,
    isNative: false,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsLocalChainTrades: true,
  },
  {
    key: 'NMC',
    name: 'Namecoin',
    ticker: 'NMC',
    coinEnum: 'NMC',
    route: 'namecoin',
    defaultFee: 0.001,
    isNative: false,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsLocalChainTrades: true,
  },
  {
    key: 'FIRO',
    name: 'Firo',
    ticker: 'FIRO',
    coinEnum: 'FIRO',
    route: 'firo',
    defaultFee: 0.001,
    isNative: false,
    decimalPlaces: 8,
    activeNetwork: 'MAIN',
    supportsHtlc: true,
    supportsLocalChainTrades: true,
  },
];

// Full metadata for all Home-supported chains.
export const KNOWN_CHAINS: ChainConfig[] = [...DEFAULT_CHAINS];

export const DEFAULT_CHAIN_KEYS = new Set(DEFAULT_CHAINS.map((c) => c.key));
export const KNOWN_CHAIN_MAP = new Map(KNOWN_CHAINS.map((c) => [c.key, c]));
