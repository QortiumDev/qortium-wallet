import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncAllAddressBooksOnStartup } from '../addressBookQDN';
import type { AddressBookEntry } from '../Types';

// Override the global qapp-core mock (from setup.ts) to include the functions
// used by addressBookQDN.ts that are absent from the baseline mock.
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
  objectToBase64: vi.fn().mockResolvedValue('mock-base64'),
  base64ToObject: vi.fn(),
  useGlobal: vi.fn(() => [null, vi.fn()]),
  RequestQueueWithPromise: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ENTRY_ALICE: AddressBookEntry = {
  id: 'entry-alice',
  name: 'Alice',
  address: 'Qj9aLrdK2FLQY6YssRQUkDmXNJCko2zF7e',
  note: '',
  coinType: 'QORT' as any,
  createdAt: 1000,
};

const ENTRY_BOB: AddressBookEntry = {
  id: 'entry-bob',
  name: 'Bob',
  address: 'Qj9aLrdK2FLQY6YssRQUkDmXNJCko2zABC',
  note: '',
  coinType: 'QORT' as any,
  createdAt: 2000,
};

const ENTRY_DGB: AddressBookEntry = {
  id: 'entry-dgb',
  name: 'DGB-test',
  address: 'DQgvYXiTLkZLFGEnNZYbo4bBxPu5X9Unex',
  note: '',
  coinType: 'DGB' as any,
  createdAt: 3000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'walletium-addressbook-QORT';

function setLocalStorage(
  entries: AddressBookEntry[],
  lastUpdated: number,
  coinType = 'QORT'
) {
  localStorage.setItem(
    `walletium-addressbook-${coinType}`,
    JSON.stringify({ entries, lastUpdated })
  );
}

function getStoredData(coinType = 'QORT') {
  const raw = localStorage.getItem(`walletium-addressbook-${coinType}`);
  return raw ? JSON.parse(raw) : null;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('syncAllAddressBooksOnStartup', () => {
  let mockQortalRequest: ReturnType<typeof vi.fn>;

  // The QDN data returned by DECRYPT_DATA for QORT (null = 404 / no resource).
  let qdnDataForQort: Record<string, unknown> | null;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    qdnDataForQort = null;

    // qortalRequest is a Qortal-provided global; simulate it here.
    mockQortalRequest = vi.fn(async (request: Record<string, unknown>) => {
      switch (request.action) {
        case 'GET_USER_ACCOUNT':
          return { name: 'TestUser' };

        case 'FETCH_QDN_RESOURCE':
          // Return mock encrypted data only when QDN data has been set for QORT.
          if (
            request.identifier === STORAGE_KEY &&
            qdnDataForQort !== null
          ) {
            return 'mock-encrypted-data';
          }
          // Simulate "resource not found" for every other coin / unset QORT.
          throw { error: 1401, message: '404 Not Found' };

        case 'DECRYPT_DATA':
          // Return the QDN object directly; fetchFromQDN handles the
          // `typeof === 'object' && .entries` shortcut path.
          return qdnDataForQort;

        case 'ENCRYPT_DATA':
          return 'mock-encrypted-publish-data';

        case 'PUBLISH_QDN_RESOURCE':
          return { success: true };

        default:
          throw new Error(`Unexpected qortalRequest action: ${request.action}`);
      }
    });

    (global as any).qortalRequest = mockQortalRequest;
  });

  afterEach(() => {
    delete (global as any).qortalRequest;
  });

  // Predicate: was PUBLISH_QDN_RESOURCE called for the QORT address book?
  const wasQortPublished = () =>
    mockQortalRequest.mock.calls.some(
      ([req]) =>
        req.action === 'PUBLISH_QDN_RESOURCE' &&
        req.identifier === STORAGE_KEY
    );

  // -------------------------------------------------------------------------
  // BUG FIX: skip publish when timestamps diverge but content is unchanged
  // -------------------------------------------------------------------------

  describe('BUG FIX — local timestamp newer than QDN, same content → no publish', () => {
    it('does NOT trigger the permission dialog when content is identical', async () => {
      // Local is 3000, QDN is 1000, but both carry the same entry.
      setLocalStorage([ENTRY_ALICE], 3000);
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 1000 };

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });

    it('re-aligns the local timestamp to the QDN timestamp to prevent repeat divergence', async () => {
      setLocalStorage([ENTRY_ALICE], 3000);
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 1000 };

      await syncAllAddressBooksOnStartup('TestUser');

      // Local timestamp must now match QDN so future logins see equal timestamps.
      expect(getStoredData().lastUpdated).toBe(1000);
    });

    it('preserves the existing local entries during re-alignment', async () => {
      setLocalStorage([ENTRY_ALICE], 3000);
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 1000 };

      await syncAllAddressBooksOnStartup('TestUser');

      const stored = getStoredData();
      expect(stored.entries).toHaveLength(1);
      expect(stored.entries[0].id).toBe(ENTRY_ALICE.id);
    });

    it('still works when QDN data has no pre-computed hash field', async () => {
      // Regression: the code must fall back to computing the hash from
      // qdnData.entries when qdnData.hash is absent.
      setLocalStorage([ENTRY_ALICE], 5000);
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 2000 };
      // Deliberately omitting the `hash` field.

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // BUG FIX: publish AND sync local timestamp when content genuinely differs
  // -------------------------------------------------------------------------

  describe('BUG FIX — local timestamp newer than QDN, different content → publish', () => {
    it('publishes when local has entries that are not present in QDN', async () => {
      setLocalStorage([ENTRY_BOB], 3000);
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 1000 };

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(true);
    });

    it('updates the local timestamp after a startup-triggered publish', async () => {
      setLocalStorage([ENTRY_BOB], 3000);
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 1000 };

      const before = Date.now();
      await syncAllAddressBooksOnStartup('TestUser');
      const after = Date.now();

      // The local timestamp must be advanced to ~publishedAt so the next login
      // sees equal timestamps and goes straight to the hash-comparison path.
      const newTimestamp = getStoredData().lastUpdated;
      expect(newTimestamp).toBeGreaterThanOrEqual(before);
      expect(newTimestamp).toBeLessThanOrEqual(after);
    });
  });

  // -------------------------------------------------------------------------
  // Existing behaviour: QDN is newer
  // -------------------------------------------------------------------------

  describe('QDN timestamp newer than local → update localStorage, no publish', () => {
    it('does not publish', async () => {
      setLocalStorage([ENTRY_ALICE], 1000);
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 5000 };

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });

    it('overwrites localStorage with the QDN timestamp', async () => {
      setLocalStorage([ENTRY_ALICE], 1000);
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 5000 };

      await syncAllAddressBooksOnStartup('TestUser');

      expect(getStoredData().lastUpdated).toBe(5000);
    });

    it('overwrites localStorage with the QDN entries', async () => {
      setLocalStorage([ENTRY_ALICE], 1000);
      qdnDataForQort = { entries: [ENTRY_ALICE, ENTRY_BOB], lastUpdated: 5000 };

      await syncAllAddressBooksOnStartup('TestUser');

      const stored = getStoredData();
      expect(stored.entries).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Existing behaviour: timestamps are equal
  // -------------------------------------------------------------------------

  describe('Equal timestamps → hash-based decision', () => {
    it('does not publish when hash matches (content unchanged)', async () => {
      setLocalStorage([ENTRY_ALICE], 3000);
      // Same entries → same computed hash.
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 3000 };

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });

    it('updates localStorage from QDN when stored hash does not match local content', async () => {
      setLocalStorage([ENTRY_ALICE], 3000);
      // QDN carries ENTRY_BOB with a hash value that cannot match ENTRY_ALICE.
      qdnDataForQort = {
        entries: [ENTRY_BOB],
        lastUpdated: 3000,
        hash: 'intentionally-wrong-hash',
      };

      await syncAllAddressBooksOnStartup('TestUser');

      // No publish — QDN data is authoritative when timestamps are equal.
      expect(wasQortPublished()).toBe(false);
      // Local must be updated with QDN's entries.
      const stored = getStoredData();
      expect(stored.entries[0].id).toBe(ENTRY_BOB.id);
    });
  });

  // -------------------------------------------------------------------------
  // Existing behaviour: no QDN data
  // -------------------------------------------------------------------------

  describe('No QDN data exists', () => {
    it('publishes local entries so they are backed up to QDN', async () => {
      setLocalStorage([ENTRY_ALICE], 1000);
      // qdnDataForQort stays null → FETCH_QDN_RESOURCE throws 404.

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(true);
    });

    it('does not publish when there are no local entries either', async () => {
      // Both local and QDN are empty → nothing to publish.
      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });

    it('aligns the local timestamp with QDN after publishing', async () => {
      // Root cause 1 fix: the timestamp stored locally must equal the timestamp
      // that was written into QDN so the next startup sees equal timestamps.
      setLocalStorage([ENTRY_ALICE], 1000);

      const before = Date.now();
      await syncAllAddressBooksOnStartup('TestUser');
      const after = Date.now();

      const stored = getStoredData();
      expect(stored.lastUpdated).toBeGreaterThanOrEqual(before);
      expect(stored.lastUpdated).toBeLessThanOrEqual(after);
    });

    it('records the published hash after a successful publish', async () => {
      // Root cause 2 fix: publishToQDN must write the published-hash sentinel
      // so future startups can detect a propagation-delay scenario.
      setLocalStorage([ENTRY_ALICE], 1000);

      await syncAllAddressBooksOnStartup('TestUser');

      const hash = localStorage.getItem('walletium-addressbook-published-QORT');
      expect(hash).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Steady-state: QDN and local are already in sync → never publish
  // -------------------------------------------------------------------------

  describe('Steady-state — QDN and local are already in sync', () => {
    it('does not publish when QDN carries the exact same entries and equal timestamp (hash field present)', async () => {
      // Run a first startup to capture the real hash that publishToQDN generates.
      setLocalStorage([ENTRY_ALICE], 1000);
      await syncAllAddressBooksOnStartup('TestUser');

      const publishedHash = localStorage.getItem(
        'walletium-addressbook-published-QORT'
      )!;
      const alignedTimestamp = getStoredData().lastUpdated;

      // QDN now has the published data (propagation complete).
      qdnDataForQort = {
        entries: [ENTRY_ALICE],
        lastUpdated: alignedTimestamp,
        hash: publishedHash,
      };
      mockQortalRequest.mockClear();

      // Second startup: content and timestamp match → must stay silent.
      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });

    it('does not modify localStorage when already in sync', async () => {
      setLocalStorage([ENTRY_ALICE], 1000);
      await syncAllAddressBooksOnStartup('TestUser');

      const publishedHash = localStorage.getItem(
        'walletium-addressbook-published-QORT'
      )!;
      const alignedTimestamp = getStoredData().lastUpdated;

      qdnDataForQort = {
        entries: [ENTRY_ALICE],
        lastUpdated: alignedTimestamp,
        hash: publishedHash,
      };
      mockQortalRequest.mockClear();

      await syncAllAddressBooksOnStartup('TestUser');

      const stored = getStoredData();
      expect(stored.lastUpdated).toBe(alignedTimestamp);
      expect(stored.entries).toHaveLength(1);
      expect(stored.entries[0].id).toBe(ENTRY_ALICE.id);
    });

    it('does not publish when timestamps are equal but QDN has no hash field', async () => {
      // Regression: when qdnData.hash is absent the branch is skipped; verify
      // the fallback "in sync" path never triggers a publish either.
      setLocalStorage([ENTRY_ALICE], 3000);
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 3000 }; // no hash

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Fresh install: no local data, QDN has data → download only, never publish
  // -------------------------------------------------------------------------

  describe('Fresh install — no local data, QDN has data', () => {
    it('downloads QDN data without publishing', async () => {
      // localStorage is empty; QDN has existing entries from another device.
      qdnDataForQort = { entries: [ENTRY_ALICE, ENTRY_BOB], lastUpdated: 5000 };

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });

    it('stores QDN entries and timestamp in localStorage after download', async () => {
      qdnDataForQort = { entries: [ENTRY_ALICE, ENTRY_BOB], lastUpdated: 5000 };

      await syncAllAddressBooksOnStartup('TestUser');

      const stored = getStoredData();
      expect(stored.lastUpdated).toBe(5000);
      expect(stored.entries).toHaveLength(2);
    });

    it('does not publish on the second startup after the QDN download', async () => {
      // First startup: no local → download from QDN.
      qdnDataForQort = { entries: [ENTRY_ALICE], lastUpdated: 5000 };
      await syncAllAddressBooksOnStartup('TestUser');
      expect(wasQortPublished()).toBe(false);
      expect(getStoredData().lastUpdated).toBe(5000);

      mockQortalRequest.mockClear();

      // Second startup: local now has data aligned with QDN.
      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // BUG: optional `updatedAt` field causes hash divergence → spurious publish
  // even though the user-visible content is unchanged.
  //
  // Scenario: the user calls updateAddress (which stamps updatedAt on the
  // entry and advances localLastUpdated). QDN was published before updatedAt
  // existed, so the stored QDN hash was computed without that field.
  // At the next startup: localLastUpdated > qdnLastUpdated (Path B), hashes
  // differ only because of updatedAt → the code publishes unnecessarily.
  // -------------------------------------------------------------------------

  describe('BUG — updatedAt field in local entry causes hash mismatch with QDN', () => {
    it('publishes even though only the internal updatedAt field differs (bug: should NOT publish)', async () => {
      // Simulate updateAddress having been called: entry now has updatedAt and
      // local timestamp is newer than QDN.
      const entryWithUpdatedAt = { ...ENTRY_ALICE, updatedAt: 99999 };
      setLocalStorage([entryWithUpdatedAt], 5000); // local is newer

      // QDN was last published at 3000, before updatedAt was introduced.
      // Its stored hash was computed from the entry WITHOUT updatedAt.
      // We simulate that by computing what the QDN hash *would* have been
      // (we use the sentinel approach: publish the old entry once to capture
      // its real hash, then set QDN accordingly).
      setLocalStorage([ENTRY_ALICE], 1000);
      await syncAllAddressBooksOnStartup('TestUser'); // publishes ENTRY_ALICE
      const qdnHash = localStorage.getItem(
        'walletium-addressbook-published-QORT'
      )!;
      const qdnTimestamp = getStoredData().lastUpdated;
      mockQortalRequest.mockClear();
      localStorage.clear();

      // Now restore the "post-updateAddress" local state.
      setLocalStorage([entryWithUpdatedAt], qdnTimestamp + 1000); // local > QDN
      qdnDataForQort = {
        entries: [ENTRY_ALICE],
        lastUpdated: qdnTimestamp,
        hash: qdnHash,
      };

      await syncAllAddressBooksOnStartup('TestUser');

      // BUG: the code currently DOES publish because generateHash(localEntries)
      // includes updatedAt while qdnHash was computed without it.
      // Once the bug is fixed (e.g. by excluding updatedAt from the hash),
      // change this expectation to toBe(false).
      expect(wasQortPublished()).toBe(true); // documents current (buggy) behaviour
    });
  });

  // -------------------------------------------------------------------------
  // BUG FIX: skip publish when QDN is null but content matches last publish
  // (root cause 2 — QDN propagation delay)
  // -------------------------------------------------------------------------

  describe('BUG FIX — QDN unavailable but content matches last publish → no publish', () => {
    it('does NOT publish on the second startup when content is unchanged', async () => {
      // First startup: QDN is null, local has entries → publishes and records hash.
      setLocalStorage([ENTRY_ALICE], 1000);
      await syncAllAddressBooksOnStartup('TestUser');
      expect(wasQortPublished()).toBe(true);

      // Reset call recorder.
      mockQortalRequest.mockClear();

      // Second startup: QDN still null (propagation delay), same content.
      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(false);
    });

    it('DOES publish when content has changed since the last publish', async () => {
      // Simulate a prior publish of ENTRY_ALICE.
      setLocalStorage([ENTRY_ALICE], 1000);
      await syncAllAddressBooksOnStartup('TestUser');
      mockQortalRequest.mockClear();

      // User adds ENTRY_BOB locally; QDN is still null.
      setLocalStorage([ENTRY_ALICE, ENTRY_BOB], 2000);

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(true);
    });

    it('publishes on first startup when the published-hash sentinel is absent', async () => {
      // No prior publish recorded.
      setLocalStorage([ENTRY_ALICE], 1000);
      // qdnDataForQort remains null.

      await syncAllAddressBooksOnStartup('TestUser');

      expect(wasQortPublished()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // BUG FIX: QDN returns a resource for the wrong coin type (storage mix)
  //
  // Scenario: the Qortal node returns the DGB resource when asked for the QORT
  // identifier (e.g. because the QORT resource does not exist yet and the node
  // falls back to the most-recently-published resource for that service/name).
  // The coinType field on the returned object must cause the sync to discard
  // the data rather than store DGB entries under walletium-addressbook-QORT.
  // -------------------------------------------------------------------------

  describe('BUG FIX — QDN returns resource with mismatched coinType → discard', () => {
    it('does not store entries from a mismatched top-level coinType into local storage', async () => {
      // QORT local storage is empty. QDN returns DGB data for the QORT identifier.
      qdnDataForQort = { coinType: 'DGB', entries: [ENTRY_DGB], lastUpdated: 5000 };

      await syncAllAddressBooksOnStartup('TestUser');

      // QORT storage must remain empty — DGB entries must not bleed in.
      expect(getStoredData('QORT')).toBeNull();
    });

    it('does not overwrite existing QORT entries with entries from a wrong top-level coinType', async () => {
      setLocalStorage([ENTRY_ALICE], 1000);
      // QDN returns DGB data with a newer timestamp — without the fix this
      // would overwrite ENTRY_ALICE with ENTRY_DGB under the QORT key.
      qdnDataForQort = { coinType: 'DGB', entries: [ENTRY_DGB], lastUpdated: 5000 };

      await syncAllAddressBooksOnStartup('TestUser');

      const stored = getStoredData('QORT');
      expect(stored.entries).toHaveLength(1);
      expect(stored.entries[0].id).toBe(ENTRY_ALICE.id);
    });

    it('does not store entries when only the entries coinType mismatches (old format, no top-level coinType)', async () => {
      // Old QDN resources published before the fix have no top-level coinType.
      // The secondary check on entries must still reject them.
      qdnDataForQort = { entries: [ENTRY_DGB], lastUpdated: 5000 };

      await syncAllAddressBooksOnStartup('TestUser');

      expect(getStoredData('QORT')).toBeNull();
    });

    it('does not overwrite existing QORT entries from old-format resource with wrong entries coinType', async () => {
      setLocalStorage([ENTRY_ALICE], 1000);
      qdnDataForQort = { entries: [ENTRY_DGB], lastUpdated: 5000 };

      await syncAllAddressBooksOnStartup('TestUser');

      const stored = getStoredData('QORT');
      expect(stored.entries).toHaveLength(1);
      expect(stored.entries[0].id).toBe(ENTRY_ALICE.id);
    });
  });
});
