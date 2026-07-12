const CACHE_PREFIX = 'payment-msg-';

export interface MessagePayload {
  message: string;
  txHash: string;
  coin: string;
  amount: string;
  timestamp: number;
}

export function getMessageQdnIdentifier(txHash: string): string {
  return `wallet-payment-msg-${txHash}`;
}

export function cacheMessage(txHash: string, message: string): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${txHash}`, message);
  } catch {
    /* quota exceeded - silently drop */
  }
}

export function getCachedMessage(txHash: string): string | null {
  return localStorage.getItem(`${CACHE_PREFIX}${txHash}`);
}

export function buildMessagePayload(
  message: string,
  txHash: string,
  coin: string,
  amount: string
): MessagePayload {
  return { message, txHash, coin, amount, timestamp: Date.now() };
}

export async function resolveQortName(name: string): Promise<string | null> {
  try {
    const res = await qdnRequest({ action: 'GET_NAME_DATA', name } as any);
    return res?.owner ?? null;
  } catch {
    return null;
  }
}

export async function fetchPublicKey(qortAddress: string): Promise<string | null> {
  try {
    const res = await qdnRequest({
      action: 'FETCH_NODE_API',
      path: `/addresses/${qortAddress}`,
    } as any);
    return res?.publicKey ?? null;
  } catch {
    return null;
  }
}

export async function fetchNameForAddress(qortAddress: string): Promise<string | null> {
  try {
    const res = await qdnRequest({
      action: 'FETCH_NODE_API',
      path: `/names/address/${qortAddress}`,
    } as any);
    const names = Array.isArray(res) ? res : [];
    return names[0]?.name ?? null;
  } catch {
    return null;
  }
}

export async function publishPaymentMessage(
  payload: MessagePayload,
  senderPublicKey: string,
  recipientPublicKey: string
): Promise<void> {
  const data64 = btoa(JSON.stringify(payload));

  const encrypted: string = await qdnRequest({
    action: 'ENCRYPT_DATA',
    data64,
    publicKeys: [recipientPublicKey, senderPublicKey],
  } as any);

  await qdnRequest({
    action: 'PUBLISH_QDN_RESOURCE',
    service: 'ARBITRARY',
    identifier: getMessageQdnIdentifier(payload.txHash),
    data64: encrypted,
  } as any);
}

export async function fetchPaymentMessage(
  senderName: string,
  txHash: string
): Promise<string | null> {
  try {
    const resourceData: string = await qdnRequest({
      action: 'FETCH_QDN_RESOURCE',
      service: 'ARBITRARY',
      name: senderName,
      identifier: getMessageQdnIdentifier(txHash),
      encoding: 'base64',
    } as any);

    if (!resourceData) return null;

    const decrypted: string = await qdnRequest({
      action: 'DECRYPT_DATA',
      encryptedData: resourceData,
    } as any);

    const parsed: MessagePayload = JSON.parse(atob(decrypted));
    return parsed.message ?? null;
  } catch {
    return null;
  }
}
