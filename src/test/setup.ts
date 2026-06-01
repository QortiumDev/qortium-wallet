import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock qapp-core module
vi.mock('qapp-core', () => ({
  Coin: {
    BTC: 'BTC',
    DOGE: 'DOGE',
    LTC: 'LTC',
    RVN: 'RVN',
    DGB: 'DGB',
    QORT: 'QORT',
    ARRR: 'ARRR',
  },
  useGlobal: vi.fn(() => [null, vi.fn()]),
  RequestQueueWithPromise: vi.fn(),
}));
