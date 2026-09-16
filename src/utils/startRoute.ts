import { QORT_CHAIN } from '../config/chains';

// Longest plausible recipient: a Qortal-family address is 34 chars and a
// registered name is capped at 40. Anything longer is not a target, just noise.
const MAX_RECIPIENT_LENGTH = 64;

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Where the app should start, derived from the top-level query string Home
 * hands it on the canonical `qdn://APP/Wallet/Wallet` address.
 *
 * `_route` is the existing hash-router hand-off and always wins. `to` (and a
 * bare `send=true`) is the Home `wallet` assignment-role contract
 * (qortium-home docs/HOME_APP_ASSIGNMENTS.md): a context-menu "Send coins" on an
 * account opens `?to=<address>`, so it lands on the native-coin send form with
 * the recipient filled in. Returns the hash route to apply, or null to start
 * on the coin grid as usual.
 */
export function resolveStartRoute(search: string): string | null {
  const params = new URLSearchParams(search);
  const startRoute = params.get('_route');
  if (startRoute) return startRoute;

  const to = (params.get('to') ?? '').trim();
  const send = params.get('send') === 'true';
  if (!to && !send) return null;
  if (to.length > MAX_RECIPIENT_LENGTH || hasControlCharacter(to)) {
    return null;
  }
  const query = new URLSearchParams({ send: 'true' });
  if (to) query.set('to', to);
  return `/${QORT_CHAIN.route}?${query.toString()}`;
}
