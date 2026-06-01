import { describe, it, expect, beforeEach } from 'vitest';
import { Coin } from 'qapp-core';
import {
  getAddressBook,
  addAddress,
  updateAddress,
  deleteAddress,
  searchAddresses,
} from '../../../utils/addressBookStorage';

/**
 * Integration tests for the Address Book feature
 * These tests verify the complete flow of address book operations
 * including add, edit, delete, search, and multi-coin isolation
 */
describe('AddressBook Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Complete user flow: Add, Edit, Search, Delete', () => {
    it('should allow adding multiple addresses and maintain them in storage', () => {
      // Initial state: Empty address book
      let entries = getAddressBook(Coin.BTC);
      expect(entries).toHaveLength(0);

      // Add first address
      const alice = addAddress({
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: 'My first wallet',
        coinType: Coin.BTC,
      });

      expect(alice).toHaveProperty('id');
      expect(alice).toHaveProperty('createdAt');
      expect(alice.name).toBe('Alice');

      // Verify it's in storage
      entries = getAddressBook(Coin.BTC);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('Alice');

      // Add second address
      const bob = addAddress({
        name: 'Bob',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        note: 'Trading account',
        coinType: Coin.BTC,
      });

      expect(bob).toHaveProperty('id');
      expect(bob.id).not.toBe(alice.id); // Different IDs

      // Verify both are in storage
      entries = getAddressBook(Coin.BTC);
      expect(entries).toHaveLength(2);
    });

    it('should allow editing an existing address', () => {
      // Add an address
      const alice = addAddress({
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: 'Original note',
        coinType: Coin.BTC,
      });

      // Update the address
      const updated = updateAddress(alice.id, Coin.BTC, {
        note: 'Updated note',
      });

      expect(updated).not.toBeNull();
      expect(updated!.note).toBe('Updated note');
      expect(updated!.name).toBe('Alice'); // Name unchanged
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(alice.createdAt);

      // Verify update persisted
      const entries = getAddressBook(Coin.BTC);
      expect(entries[0].note).toBe('Updated note');
    });

    it('should allow deleting an address', () => {
      // Add two addresses
      addAddress({
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });

      const bob = addAddress({
        name: 'Bob',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        note: '',
        coinType: Coin.BTC,
      });

      let entries = getAddressBook(Coin.BTC);
      expect(entries).toHaveLength(2);

      // Delete Bob
      const deleted = deleteAddress(bob.id, Coin.BTC);
      expect(deleted).toBe(true);

      // Verify only Alice remains
      entries = getAddressBook(Coin.BTC);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('Alice');
    });

    it('should search addresses by name, address, or note', () => {
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

      // Search by name
      let results = searchAddresses(Coin.BTC, 'alice');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alice Smith');

      // Search by address
      results = searchAddresses(Coin.BTC, '1bvbm');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Bob Jones');

      // Search by note
      results = searchAddresses(Coin.BTC, 'trading');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Bob Jones');

      // Search with multiple results
      results = searchAddresses(Coin.BTC, 'wallet');
      expect(results).toHaveLength(2); // "primary wallet" and "Savings wallet"

      // Empty search returns all
      results = searchAddresses(Coin.BTC, '');
      expect(results).toHaveLength(3);
    });
  });

  describe('Validation and error handling', () => {
    it('should prevent duplicate addresses', () => {
      const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

      // Add first entry
      addAddress({
        name: 'Alice',
        address,
        note: '',
        coinType: Coin.BTC,
      });

      // Try to add duplicate
      expect(() =>
        addAddress({
          name: 'Bob',
          address, // Same address
          note: '',
          coinType: Coin.BTC,
        })
      ).toThrow('Address already exists');
    });

    it('should validate name length', () => {
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

    it('should validate note length', () => {
      const longNote = 'a'.repeat(201);

      expect(() =>
        addAddress({
          name: 'Alice',
          address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          note: longNote,
          coinType: Coin.BTC,
        })
      ).toThrow('200 characters or less');
    });

    it('should return null when updating non-existent entry', () => {
      const result = updateAddress('non-existent-id', Coin.BTC, {
        name: 'Updated',
      });

      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent entry', () => {
      const result = deleteAddress('non-existent-id', Coin.BTC);

      expect(result).toBe(false);
    });
  });

  describe('Sorting behavior', () => {
    it('should return entries sorted alphabetically by name', () => {
      // Add entries in non-alphabetical order
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

      const entries = getAddressBook(Coin.BTC);

      expect(entries).toHaveLength(3);
      expect(entries[0].name).toBe('Alice');
      expect(entries[1].name).toBe('Mike');
      expect(entries[2].name).toBe('Zebra');
    });

    it('should sort case-insensitively', () => {
      addAddress({
        name: 'zebra',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });

      addAddress({
        name: 'ALICE',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        note: '',
        coinType: Coin.BTC,
      });

      const entries = getAddressBook(Coin.BTC);

      expect(entries[0].name).toBe('ALICE');
      expect(entries[1].name).toBe('zebra');
    });
  });

  describe('Multi-coin isolation', () => {
    it('should keep address books separate for different coins', () => {
      // Add BTC address
      addAddress({
        name: 'BTC Alice',
        address: '1BTCAddress',
        note: '',
        coinType: Coin.BTC,
      });

      // Add DOGE address
      addAddress({
        name: 'DOGE Bob',
        address: 'DDogeAddress',
        note: '',
        coinType: Coin.DOGE,
      });

      // Add LTC address
      addAddress({
        name: 'LTC Charlie',
        address: 'LLTCAddress',
        note: '',
        coinType: Coin.LTC,
      });

      // Verify each coin has only its own addresses
      const btcEntries = getAddressBook(Coin.BTC);
      expect(btcEntries).toHaveLength(1);
      expect(btcEntries[0].name).toBe('BTC Alice');

      const dogeEntries = getAddressBook(Coin.DOGE);
      expect(dogeEntries).toHaveLength(1);
      expect(dogeEntries[0].name).toBe('DOGE Bob');

      const ltcEntries = getAddressBook(Coin.LTC);
      expect(ltcEntries).toHaveLength(1);
      expect(ltcEntries[0].name).toBe('LTC Charlie');

      // Verify QORT is empty
      const qortEntries = getAddressBook(Coin.QORT);
      expect(qortEntries).toHaveLength(0);
    });

    it('should allow same address in different coin types', () => {
      const address = 'SameAddressForDifferentCoins';

      // This should work because they're different coin types
      addAddress({
        name: 'BTC User',
        address,
        note: '',
        coinType: Coin.BTC,
      });

      addAddress({
        name: 'DOGE User',
        address,
        note: '',
        coinType: Coin.DOGE,
      });

      const btcEntries = getAddressBook(Coin.BTC);
      const dogeEntries = getAddressBook(Coin.DOGE);

      expect(btcEntries).toHaveLength(1);
      expect(dogeEntries).toHaveLength(1);
      expect(btcEntries[0].address).toBe(address);
      expect(dogeEntries[0].address).toBe(address);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist data across getAddressBook calls', () => {
      addAddress({
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });

      // First retrieval
      const entries1 = getAddressBook(Coin.BTC);
      expect(entries1).toHaveLength(1);

      // Second retrieval (should read from localStorage)
      const entries2 = getAddressBook(Coin.BTC);
      expect(entries2).toHaveLength(1);
      expect(entries2[0].name).toBe('Alice');
    });

    it('should store with metadata structure', () => {
      addAddress({
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });

      const stored = localStorage.getItem('walletium-addressbook-BTC');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveProperty('entries');
      expect(parsed).toHaveProperty('lastUpdated');
      expect(Array.isArray(parsed.entries)).toBe(true);
      expect(typeof parsed.lastUpdated).toBe('number');
    });

    it('should update lastUpdated timestamp on changes', () => {
      const before = Date.now();

      addAddress({
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: '',
        coinType: Coin.BTC,
      });

      const after = Date.now();

      const stored = localStorage.getItem('walletium-addressbook-BTC');
      const parsed = JSON.parse(stored!);

      expect(parsed.lastUpdated).toBeGreaterThanOrEqual(before);
      expect(parsed.lastUpdated).toBeLessThanOrEqual(after);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle adding, updating, and deleting in sequence', () => {
      // Add
      const entry = addAddress({
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        note: 'Original',
        coinType: Coin.BTC,
      });

      let entries = getAddressBook(Coin.BTC);
      expect(entries).toHaveLength(1);

      // Update
      updateAddress(entry.id, Coin.BTC, { note: 'Updated' });

      entries = getAddressBook(Coin.BTC);
      expect(entries[0].note).toBe('Updated');

      // Delete
      deleteAddress(entry.id, Coin.BTC);

      entries = getAddressBook(Coin.BTC);
      expect(entries).toHaveLength(0);
    });

    it('should handle bulk operations across multiple coins', () => {
      const coins = [Coin.BTC, Coin.DOGE, Coin.LTC];

      // Add 3 entries for each coin
      coins.forEach(coin => {
        for (let i = 1; i <= 3; i++) {
          addAddress({
            name: `User${i}`,
            address: `${coin}Address${i}`,
            note: `Note ${i}`,
            coinType: coin,
          });
        }
      });

      // Verify each coin has 3 entries
      coins.forEach(coin => {
        const entries = getAddressBook(coin);
        expect(entries).toHaveLength(3);
      });

      // Delete all entries from BTC
      const btcEntries = getAddressBook(Coin.BTC);
      btcEntries.forEach(entry => {
        deleteAddress(entry.id, Coin.BTC);
      });

      // Verify BTC is empty but others are not
      expect(getAddressBook(Coin.BTC)).toHaveLength(0);
      expect(getAddressBook(Coin.DOGE)).toHaveLength(3);
      expect(getAddressBook(Coin.LTC)).toHaveLength(3);
    });
  });
});
