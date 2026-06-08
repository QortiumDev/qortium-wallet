import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Coin } from 'qapp-core';
import {
  getAddressBook,
  addAddress,
  updateAddress,
  deleteAddress,
  searchAddresses,
} from '../addressBookStorage';
import type { AddressBookEntry } from '../Types';

// Mock the QDN module to prevent actual syncing during tests
vi.mock('../addressBookQDN', () => ({
  debouncedPublishToQDN: vi.fn(),
}));

describe('addressBookStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getAddressBook()', () => {
    it('should return empty array for new coin type', () => {
      const result = getAddressBook(Coin.BTC);
      expect(result).toEqual([]);
    });

    it('should return saved addresses', () => {
      const entry: Omit<AddressBookEntry, 'id' | 'createdAt'> = {
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: 'Test address',
        coinType: Coin.BTC,
      };

      addAddress(entry);
      const result = getAddressBook(Coin.BTC);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: 'Test address',
      });
    });

    it('should return addresses sorted alphabetically by name', () => {
      // Add addresses in non-alphabetical order
      addAddress({
        name: 'Zebra',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });

      addAddress({
        name: 'Alice',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        note: '',
        coinType: Coin.BTC,
      });

      addAddress({
        name: 'Mike',
        address: '3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy',
        note: '',
        coinType: Coin.BTC,
      });

      const result = getAddressBook(Coin.BTC);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Mike');
      expect(result[2].name).toBe('Zebra');
    });

    it('should handle corrupted localStorage data', () => {
      // Manually set corrupted data
      localStorage.setItem('walletium-addressbook-BTC', 'corrupted-json');

      const result = getAddressBook(Coin.BTC);
      expect(result).toEqual([]);
    });

    it('should handle old format (array) and migrate to new format', () => {
      // Set old format (plain array)
      const oldFormatData = [
        {
          id: 'test-1',
          name: 'Alice',
          address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          note: 'Test',
          coinType: Coin.BTC,
          createdAt: Date.now(),
        },
      ];
      localStorage.setItem(
        'walletium-addressbook-BTC',
        JSON.stringify(oldFormatData)
      );

      const result = getAddressBook(Coin.BTC);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');

      // Check that it was migrated to new format
      const stored = localStorage.getItem('walletium-addressbook-BTC');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveProperty('entries');
      expect(parsed).toHaveProperty('lastUpdated');
    });

    it('migration sets lastUpdated to 0 so QDN is always treated as newer', () => {
      // Root cause 3 fix: old-format data must migrate with lastUpdated:0 so
      // that any valid QDN timestamp (> 0) takes precedence on startup sync,
      // avoiding a spurious "local is newer" publish proposal.
      const oldFormatData = [
        {
          id: 'test-1',
          name: 'Alice',
          address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          note: '',
          coinType: Coin.BTC,
          createdAt: 1000,
        },
      ];
      localStorage.setItem(
        'walletium-addressbook-BTC',
        JSON.stringify(oldFormatData)
      );

      getAddressBook(Coin.BTC);

      const stored = localStorage.getItem('walletium-addressbook-BTC');
      const parsed = JSON.parse(stored!);
      expect(parsed.lastUpdated).toBe(0);
    });
  });

  describe('addAddress()', () => {
    it('should successfully add new address', () => {
      const entry: Omit<AddressBookEntry, 'id' | 'createdAt'> = {
        name: 'Bob',
        address: 'DQrVEamqXvhFyxBGPJjGRzS9ZWmcK2shKR',
        note: 'My DOGE wallet',
        coinType: Coin.DOGE,
      };

      const result = addAddress(entry);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
      expect(result.name).toBe('Bob');
      expect(result.address).toBe('DQrVEamqXvhFyxBGPJjGRzS9ZWmcK2shKR');
    });

    it('should generate unique ID', () => {
      const entry1 = addAddress({
        name: 'User1',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });

      const entry2 = addAddress({
        name: 'User2',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        note: '',
        coinType: Coin.BTC,
      });

      expect(entry1.id).not.toBe(entry2.id);
    });

    it('should set createdAt timestamp', () => {
      const before = Date.now();
      const result = addAddress({
        name: 'Test',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });
      const after = Date.now();

      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
    });

    it('should validate name length (max 50)', () => {
      const longName = 'a'.repeat(51);

      expect(() =>
        addAddress({
          name: longName,
          address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          note: '',
          coinType: Coin.BTC,
        })
      ).toThrow('50 characters or less');
    });

    it('should validate note length (max 200)', () => {
      const longNote = 'a'.repeat(201);

      expect(() =>
        addAddress({
          name: 'Test',
          address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          note: longNote,
          coinType: Coin.BTC,
        })
      ).toThrow('200 characters or less');
    });

    it('should prevent duplicate addresses', () => {
      const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

      addAddress({
        name: 'First',
        address,
        note: '',
        coinType: Coin.BTC,
      });

      expect(() =>
        addAddress({
          name: 'Second',
          address,
          note: '',
          coinType: Coin.BTC,
        })
      ).toThrow('Address already exists');
    });

    it('should store with metadata structure', () => {
      addAddress({
        name: 'Test',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });

      const stored = localStorage.getItem('walletium-addressbook-BTC');
      const parsed = JSON.parse(stored!);

      expect(parsed).toHaveProperty('entries');
      expect(parsed).toHaveProperty('lastUpdated');
      expect(Array.isArray(parsed.entries)).toBe(true);
      expect(typeof parsed.lastUpdated).toBe('number');
    });
  });

  describe('updateAddress()', () => {
    let existingEntry: AddressBookEntry;

    beforeEach(() => {
      existingEntry = addAddress({
        name: 'Original',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: 'Original note',
        coinType: Coin.BTC,
      });
    });

    it('should successfully update existing address', () => {
      const result = updateAddress(existingEntry.id, Coin.BTC, {
        name: 'Updated',
        note: 'Updated note',
      });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated');
      expect(result!.note).toBe('Updated note');
      expect(result!.address).toBe(existingEntry.address); // Address unchanged
    });

    it('should set updatedAt timestamp', () => {
      const before = Date.now();
      const result = updateAddress(existingEntry.id, Coin.BTC, {
        name: 'Updated',
      });
      const after = Date.now();

      expect(result).not.toBeNull();
      expect(result!.updatedAt).toBeGreaterThanOrEqual(before);
      expect(result!.updatedAt).toBeLessThanOrEqual(after);
    });

    it('should return null for non-existent ID', () => {
      const result = updateAddress('non-existent-id', Coin.BTC, {
        name: 'Updated',
      });

      expect(result).toBeNull();
    });

    it('should validate name length on update', () => {
      const longName = 'a'.repeat(51);

      expect(() =>
        updateAddress(existingEntry.id, Coin.BTC, {
          name: longName,
        })
      ).toThrow('50 characters or less');
    });

    it('should validate note length on update', () => {
      const longNote = 'a'.repeat(201);

      expect(() =>
        updateAddress(existingEntry.id, Coin.BTC, {
          note: longNote,
        })
      ).toThrow('200 characters or less');
    });
  });

  describe('deleteAddress()', () => {
    let existingEntry: AddressBookEntry;

    beforeEach(() => {
      existingEntry = addAddress({
        name: 'ToDelete',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });
    });

    it('should successfully delete existing address', () => {
      const result = deleteAddress(existingEntry.id, Coin.BTC);

      expect(result).toBe(true);

      const addresses = getAddressBook(Coin.BTC);
      expect(addresses).toHaveLength(0);
    });

    it('should return false for non-existent ID', () => {
      const result = deleteAddress('non-existent-id', Coin.BTC);

      expect(result).toBe(false);
    });

    it('should not affect other addresses', () => {
      const entry2 = addAddress({
        name: 'Keep',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        note: '',
        coinType: Coin.BTC,
      });

      deleteAddress(existingEntry.id, Coin.BTC);

      const addresses = getAddressBook(Coin.BTC);
      expect(addresses).toHaveLength(1);
      expect(addresses[0].id).toBe(entry2.id);
    });
  });

  describe('searchAddresses()', () => {
    beforeEach(() => {
      // Add test data
      addAddress({
        name: 'Alice Smith',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: 'My primary wallet',
        coinType: Coin.BTC,
      });

      addAddress({
        name: 'Bob Jones',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        note: 'Trading account',
        coinType: Coin.BTC,
      });

      addAddress({
        name: 'Charlie Brown',
        address: '3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy',
        note: 'Savings wallet',
        coinType: Coin.BTC,
      });
    });

    it('should filter by name (case-insensitive)', () => {
      const result = searchAddresses(Coin.BTC, 'alice');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice Smith');
    });

    it('should filter by address (case-insensitive)', () => {
      const result = searchAddresses(Coin.BTC, '1bvbm');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bob Jones');
    });

    it('should filter by note (case-insensitive)', () => {
      const result = searchAddresses(Coin.BTC, 'trading');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bob Jones');
    });

    it('should return partial matches', () => {
      const result = searchAddresses(Coin.BTC, 'wallet');

      expect(result).toHaveLength(2); // "primary wallet" and "Savings wallet"
    });

    it('should return all addresses for empty query', () => {
      const result = searchAddresses(Coin.BTC, '');

      expect(result).toHaveLength(3);
    });

    it('should return sorted results', () => {
      const result = searchAddresses(Coin.BTC, 'wallet');

      // Should be sorted alphabetically
      expect(result[0].name).toBe('Alice Smith');
      expect(result[1].name).toBe('Charlie Brown');
    });

    it('should return empty array for no matches', () => {
      const result = searchAddresses(Coin.BTC, 'nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('localStorage errors', () => {
    it('should handle quota exceeded gracefully', () => {
      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() =>
        addAddress({
          name: 'Test',
          address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          note: '',
          coinType: Coin.BTC,
        })
      ).toThrow();

      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('should handle JSON parse errors', () => {
      localStorage.setItem('walletium-addressbook-BTC', '{invalid json}');

      const result = getAddressBook(Coin.BTC);
      expect(result).toEqual([]);
    });

    it('should return empty array when localStorage is unavailable', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });

      const result = getAddressBook(Coin.BTC);
      expect(result).toEqual([]);

      // Restore
      localStorage.getItem = originalGetItem;
    });
  });
});
