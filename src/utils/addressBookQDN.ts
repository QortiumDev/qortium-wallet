import { base64ToObject, Coin, objectToBase64 } from 'qapp-core';
import { AddressBookEntry } from './Types';
import { getAddressBook } from './addressBookStorage';

/**
 * Get all available coin types from the Coin enum
 */
function getAvailableCoins(): Coin[] {
  return Object.values(Coin);
}

/**
 * Get the current authenticated username
 * This uses qortalRequest to avoid React hook dependency
 */
async function getCurrentUserName(): Promise<string | null> {
  try {
    const response = await qortalRequest({
      action: 'GET_USER_ACCOUNT',
    });
    return response?.name || null;
  } catch (error) {
    console.error('QDN Sync: Failed to get username', error);
    return null;
  }
}

/**
 * Data structure for QDN storage
 * Includes entries, timestamp, and optional hash for conflict detection
 */
export interface AddressBookQDNData {
  coinType?: string; // Guards against QDN returning a resource for the wrong coin
  entries: AddressBookEntry[];
  lastUpdated: number; // Unix timestamp
  hash?: string; // Optional: hash of entries for quick comparison
}

/**
 * Interface for localStorage structure with metadata
 */
interface AddressBookLocalStorage {
  entries: AddressBookEntry[];
  lastUpdated: number;
}

/**
 * Debounce timeouts for each coin type
 */
const publishTimeouts: { [coinType: string]: NodeJS.Timeout } = {};

/**
 * Generates a hash of the entries for quick comparison
 * Sorts entries by ID before hashing to ensure order-independence
 */
function generateHash(entries: AddressBookEntry[]): string {
  // Sort entries by ID to ensure consistent hash regardless of order
  const sortedEntries = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const dataString = JSON.stringify(sortedEntries);

  // Simple hash function (djb2 algorithm variant)
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Encrypts and publishes the address book to QDN
 * Gracefully handles errors without throwing
 * @param coinType - The coin type (BTC, DOGE, etc.)
 * @param entries - The address book entries to publish
 * @param userName - Optional username (if not provided, will attempt to fetch)
 */
/**
 * Key that records the hash of the last successfully published snapshot.
 * Used to skip re-publishing when QDN is temporarily unavailable (propagation
 * delay) but the local content has not changed since the last publish.
 */
function publishedHashKey(coinType: string): string {
  return `walletium-addressbook-published-${coinType}`;
}

async function ensureAccountUnlocked(): Promise<boolean> {
  const result = (await qortalRequest({
    action: 'UNLOCK_SELECTED_ACCOUNT',
  })) as { isUnlocked?: boolean } | null;
  return result?.isUnlocked === true;
}

async function publishToQDN(
  coinType: string,
  entries: AddressBookEntry[],
  userName?: string
): Promise<number | null> {
  try {
    // Get user name from parameter or fetch it
    const actualUserName = userName || (await getCurrentUserName());

    if (!actualUserName) {
      console.error('QDN Sync: No authenticated user found');
      return null;
    }

    // Capture the timestamp now so QDN data and the returned value share
    // the same value — callers use it to align localStorage with QDN.
    const lastUpdated = Date.now();
    const hash = generateHash(entries);

    // Prepare data object with metadata
    const qdnData: AddressBookQDNData = {
      coinType,
      entries,
      lastUpdated,
      hash,
    };

    // Convert to base64 (UTF-8 safe)
    const base64 = await objectToBase64(qdnData);

    // Encrypt with user's private key
    const encryptedData = await qortalRequest({
      action: 'ENCRYPT_DATA',
      base64,
    });

    // Publish to QDN
    if (!(await ensureAccountUnlocked())) return null;
    await qortalRequest({
      action: 'PUBLISH_QDN_RESOURCE',
      base64: encryptedData,
      name: actualUserName,
      service: 'DOCUMENT_PRIVATE',
      identifier: `walletium-addressbook-${coinType}`,
    });

    // Record the published hash so future startup syncs can detect when QDN
    // is temporarily unavailable vs genuinely missing.
    localStorage.setItem(publishedHashKey(coinType), hash);

    console.log(
      `QDN Sync: Published ${coinType} address book for user ${actualUserName}`
    );
    return lastUpdated;
  } catch (error) {
    console.error(`QDN Sync Error (Publish ${coinType}):`, error);
    // Don't throw - allow localStorage to continue working
    return null;
  }
}

/**
 * Retrieves and decrypts the address book from QDN
 * Returns null on error or if no data exists
 * @param coinType - The coin type (BTC, DOGE, etc.)
 * @param userName - Optional username (if not provided, will attempt to fetch)
 */
async function fetchFromQDN(
  coinType: string,
  userName?: string
): Promise<AddressBookQDNData | null> {
  try {
    // Get user name from parameter or fetch it
    const actualUserName = userName || (await getCurrentUserName());

    if (!actualUserName) {
      console.error('QDN Sync: No authenticated user found');
      return null;
    }

    // Fetch encrypted data from QDN
    let encryptedBase64;
    try {
      encryptedBase64 = await qortalRequest({
        action: 'FETCH_QDN_RESOURCE',
        identifier: `walletium-addressbook-${coinType}`,
        service: 'DOCUMENT_PRIVATE',
        name: actualUserName,
        encoding: 'base64',
      });
    } catch (fetchError: any) {
      // Handle expected "resource not found" errors silently
      // This includes: 404 errors, 1401 errors, and "Couldn't find PUT transaction" messages
      const isResourceNotFound =
        fetchError?.message?.includes('404') ||
        fetchError?.status === 404 ||
        fetchError?.error === 1401 ||
        fetchError?.message?.includes("Couldn't find PUT transaction");

      if (isResourceNotFound) {
        // This is expected when no data has been published yet - don't log as error
        return null;
      }

      // Re-throw unexpected errors
      console.error(
        `QDN Sync: Unexpected error fetching ${coinType}:`,
        fetchError
      );
      throw fetchError;
    }

    if (!encryptedBase64) {
      console.log(`QDN Sync: No data found for ${coinType}`);
      return null;
    }

    console.log(
      `QDN Sync: Fetched encrypted data for ${coinType}, decrypting...`
    );

    // Decrypt data (returns the original base64 string)
    let decryptedBase64;
    try {
      decryptedBase64 = await qortalRequest({
        action: 'DECRYPT_DATA',
        encryptedData: encryptedBase64,
      });

      if (!decryptedBase64) {
        console.warn(
          `QDN Sync: DECRYPT_DATA returned empty result for ${coinType}. The data may be from an incompatible version.`
        );
        return null;
      }
    } catch {
      console.warn(
        `QDN Sync: Failed to decrypt ${coinType} data. The data may be from an incompatible version.`
      );
      return null;
    }

    // Try to parse the decrypted data
    let qdnData: AddressBookQDNData;

    // First, check if it's already a JSON object
    if (typeof decryptedBase64 === 'object' && decryptedBase64.entries) {
      qdnData = decryptedBase64;
    } else if (typeof decryptedBase64 === 'string') {
      try {
        qdnData = JSON.parse(decryptedBase64);
      } catch {
        // Not JSON, assume it's base64-encoded
        try {
          qdnData = base64ToObject(decryptedBase64) as AddressBookQDNData;
        } catch (base64Error) {
          console.error(
            `QDN Sync: Failed to parse decrypted data for ${coinType}:`,
            base64Error
          );
          throw new Error(
            `Unable to parse decrypted QDN data for ${coinType}. Data format mismatch.`
          );
        }
      }
    } else {
      throw new Error(
        `Unexpected decrypted data type: ${typeof decryptedBase64}`
      );
    }

    // Reject resources that carry a different coinType. This guards against
    // the node returning a resource for a different identifier when the
    // requested one is not yet available (e.g. during propagation).
    // Primary check: top-level coinType field (present in resources published
    // after the fix was deployed).
    if (qdnData.coinType && qdnData.coinType !== coinType) {
      console.warn(
        `QDN Sync: Fetched resource for "${coinType}" contains coinType "${qdnData.coinType}", discarding`
      );
      return null;
    }
    // Secondary check: entries' coinType field (covers older QDN resources that
    // predate the top-level coinType field).
    if (qdnData.entries.some((e) => e.coinType !== coinType)) {
      console.warn(
        `QDN Sync: Fetched resource for "${coinType}" contains entries with wrong coinType, discarding`
      );
      return null;
    }

    return qdnData;
  } catch (error) {
    console.error(`QDN Sync Error (Fetch ${coinType}):`, error);
    return null;
  }
}

/**
 * Syncs a single address book on startup
 * Compares timestamps to determine which version is newer
 * Uses hash comparison when timestamps are equal
 * @param coinType - The coin type to sync
 * @param userName - Optional username (if not provided, will attempt to fetch)
 */
async function syncAddressBookOnStartup(
  coinType: string,
  userName?: string
): Promise<void> {
  try {
    // Get data from both sources
    const localEntries = getAddressBook(coinType as Coin);
    const qdnData = await fetchFromQDN(coinType, userName);

    // If no QDN data exists, publish local data if any
    if (!qdnData) {
      if (localEntries.length > 0) {
        // Root cause 2 fix: skip re-publishing when QDN is temporarily
        // unavailable (propagation delay) but content hasn't changed since the
        // last successful publish — prevents a repeated permission dialog.
        const lastPublishedHash = localStorage.getItem(
          publishedHashKey(coinType)
        );
        if (lastPublishedHash === generateHash(localEntries)) {
          console.log(
            `QDN Sync: ${coinType} QDN unavailable but content matches last publish, skipping`
          );
          return;
        }
        console.log(`QDN Sync: No QDN data, publishing local ${coinType} data`);
        const publishedAt = await publishToQDN(
          coinType,
          localEntries,
          userName
        );
        if (publishedAt !== null) {
          // Align local timestamp with QDN so next startup goes to the
          // equal-timestamp path rather than re-entering the "local is newer" path.
          const localStorageKey = `walletium-addressbook-${coinType}`;
          const dataToStore: AddressBookLocalStorage = {
            entries: localEntries,
            lastUpdated: publishedAt,
          };
          localStorage.setItem(localStorageKey, JSON.stringify(dataToStore));
        }
      }
      return;
    }

    // Get local last updated timestamp from localStorage metadata
    const localStorageKey = `walletium-addressbook-${coinType}`;
    const localData = localStorage.getItem(localStorageKey);
    let localLastUpdated = 0;

    if (localData) {
      try {
        const parsed: AddressBookLocalStorage = JSON.parse(localData);
        localLastUpdated = parsed.lastUpdated || 0;
      } catch (e) {
        console.error('QDN Sync: Error parsing local data', e);
      }
    }

    // Compare timestamps to determine which is newer
    const qdnLastUpdated = qdnData.lastUpdated || 0;

    if (qdnLastUpdated > localLastUpdated) {
      // QDN data is newer, update localStorage
      console.log(
        `QDN Sync: QDN data is newer for ${coinType}, updating localStorage`
      );

      // Save to localStorage with metadata
      const dataToStore: AddressBookLocalStorage = {
        entries: qdnData.entries,
        lastUpdated: qdnData.lastUpdated,
      };
      localStorage.setItem(localStorageKey, JSON.stringify(dataToStore));
    } else if (localLastUpdated > qdnLastUpdated) {
      // Local timestamp is newer, but check content before publishing to avoid
      // unnecessary fees when timestamps diverge without actual data changes
      // (e.g. debounce timing gap, old-format migration, clock skew)
      const localHash = generateHash(localEntries);
      const qdnHash = qdnData.hash ?? generateHash(qdnData.entries);
      if (localHash === qdnHash) {
        console.log(
          `QDN Sync: ${coinType} timestamps differ but content is identical, skipping publish`
        );
        // Re-align local timestamp to QDN so future startups go straight to the
        // hash-comparison path instead of re-evaluating timestamps
        const dataToStore: AddressBookLocalStorage = {
          entries: localEntries,
          lastUpdated: qdnData.lastUpdated,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(dataToStore));
      } else {
        console.log(
          `QDN Sync: Local data is newer for ${coinType}, publishing to QDN`
        );
        // Root cause 1 fix: use the timestamp actually stored inside QDN so
        // local and QDN are identical after publish — next startup goes
        // straight to the equal-timestamp path, no hash comparison needed.
        const publishedAt = await publishToQDN(
          coinType,
          localEntries,
          userName
        );
        if (publishedAt !== null) {
          const dataToStore: AddressBookLocalStorage = {
            entries: localEntries,
            lastUpdated: publishedAt,
          };
          localStorage.setItem(localStorageKey, JSON.stringify(dataToStore));
        }
      }
    } else {
      // Same timestamp - use hash comparison if available
      if (qdnData.hash && localData) {
        const localHash = generateHash(localEntries);
        if (localHash !== qdnData.hash) {
          console.log(
            `QDN Sync: Hash mismatch for ${coinType}, using QDN data`
          );
          const dataToStore: AddressBookLocalStorage = {
            entries: qdnData.entries,
            lastUpdated: qdnData.lastUpdated,
          };
          localStorage.setItem(localStorageKey, JSON.stringify(dataToStore));
        }
      }
      console.log(`QDN Sync: ${coinType} data is in sync`);
    }
  } catch (error) {
    console.error(`QDN Sync Error (Startup ${coinType}):`, error);
    // Don't throw - allow app to continue with localStorage only
  }
}

/**
 * Syncs all coin address books on app startup
 * Runs in parallel for better performance
 * @param userName - Optional username from useAuth() hook (recommended to avoid extra API calls)
 */
export async function syncAllAddressBooksOnStartup(
  userName?: string
): Promise<void> {
  // Get all supported coin types from the Coin enum
  const coinTypes = getAvailableCoins();

  console.log('QDN Sync: Starting sync for all address books...');

  try {
    // Sync all coin types in parallel
    await Promise.all(
      coinTypes.map((coinType) => syncAddressBookOnStartup(coinType, userName))
    );

    console.log('QDN Sync: All address books synced');
  } catch (error) {
    console.error('QDN Sync: Error during startup sync', error);
    // Don't throw - allow app to continue
  }
}

/**
 * Debounced version of publishToQDN
 * Delays publish to avoid excessive network calls during rapid changes
 */
export function debouncedPublishToQDN(
  coinType: string,
  entries: AddressBookEntry[],
  delay = 2000
): void {
  // Clear existing timeout for this coin type
  if (publishTimeouts[coinType]) {
    clearTimeout(publishTimeouts[coinType]);
  }

  // Set new timeout.
  // publishToQDN never throws (errors are caught internally), but keep the
  // .catch() as a safety net. The returned timestamp is intentionally ignored
  // here: after a successful debounced publish QDN's timestamp is always
  // greater than the local lastUpdated (which was set at mutation time), so
  // the next startup sync correctly treats QDN as newer and refreshes local.
  publishTimeouts[coinType] = setTimeout(() => {
    publishToQDN(coinType, entries).catch((err) =>
      console.error('QDN Sync: Failed to publish:', err)
    );
  }, delay);
}

export { publishToQDN };
