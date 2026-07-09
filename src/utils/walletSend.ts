export function decimalPattern(decimalPlaces: number): RegExp {
  const places = Math.max(0, Math.trunc(decimalPlaces));
  if (places === 0) return /^(?:0|[1-9]\d*)$/;
  return new RegExp(`^(?:0|[1-9]\\d*)(?:\\.\\d{1,${places}})?$`);
}

export function decimalToAtomic(value: string, decimalPlaces: number): bigint {
  const trimmed = value.trim();
  if (!decimalPattern(decimalPlaces).test(trimmed)) {
    throw new Error('Invalid decimal amount');
  }

  const [whole, fraction = ''] = trimmed.split('.');
  const paddedFraction = fraction.padEnd(decimalPlaces, '0');
  const atomic = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, '');
  return BigInt(atomic || '0');
}

export function isPositiveDecimal(
  value: string,
  decimalPlaces: number
): boolean {
  try {
    return decimalToAtomic(value, decimalPlaces) > 0n;
  } catch {
    return false;
  }
}

export function isOptionalPositiveDecimal(
  value: string,
  decimalPlaces: number
): boolean {
  const trimmed = value.trim();
  return trimmed === '' || isPositiveDecimal(trimmed, decimalPlaces);
}

export function isValidRecipient(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 256;
}

export function formatAtomicAmount(
  value: string | number | bigint | undefined | null,
  decimalPlaces: number
): string {
  if (value == null || value === '') return '—';

  const raw = String(value);
  if (!/^-?\d+$/.test(raw)) return raw;

  const places = Math.max(0, Math.trunc(decimalPlaces));
  const negative = raw.startsWith('-');
  const digits = negative ? raw.slice(1) : raw;

  if (places === 0) return `${negative ? '-' : ''}${digits}`;

  const padded = digits.padStart(places + 1, '0');
  const whole = padded.slice(0, -places);
  const fraction = padded.slice(-places);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}
