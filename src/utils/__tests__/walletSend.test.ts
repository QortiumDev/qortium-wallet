import { describe, expect, it } from 'vitest';
import {
  decimalToAtomic,
  formatAtomicAmount,
  isOptionalPositiveDecimal,
  isPositiveDecimal,
  isValidRecipient,
} from '../walletSend';

describe('walletSend utilities', () => {
  it('validates positive decimal amounts against chain precision', () => {
    expect(isPositiveDecimal('1', 8)).toBe(true);
    expect(isPositiveDecimal('0.00000001', 8)).toBe(true);
    expect(isPositiveDecimal('0', 8)).toBe(false);
    expect(isPositiveDecimal('01', 8)).toBe(false);
    expect(isPositiveDecimal('1.', 8)).toBe(false);
    expect(isPositiveDecimal('.1', 8)).toBe(false);
    expect(isPositiveDecimal('1.000000001', 8)).toBe(false);
  });

  it('validates optional positive fee-per-byte values', () => {
    expect(isOptionalPositiveDecimal('', 8)).toBe(true);
    expect(isOptionalPositiveDecimal('0.0001', 8)).toBe(true);
    expect(isOptionalPositiveDecimal('0', 8)).toBe(false);
    expect(isOptionalPositiveDecimal('0.000000001', 8)).toBe(false);
  });

  it('validates recipient length', () => {
    expect(isValidRecipient('abc')).toBe(true);
    expect(isValidRecipient('')).toBe(false);
    expect(isValidRecipient(' '.repeat(3))).toBe(false);
    expect(isValidRecipient('a'.repeat(256))).toBe(true);
    expect(isValidRecipient('a'.repeat(257))).toBe(false);
  });

  it('converts decimal amounts to atomic bigint safely', () => {
    expect(decimalToAtomic('1.23456789', 8)).toBe(123456789n);
    expect(decimalToAtomic('0.00000001', 8)).toBe(1n);
    expect(decimalToAtomic('42', 0)).toBe(42n);
  });

  it('formats atomic integer strings without losing precision', () => {
    expect(formatAtomicAmount('123456789', 8)).toBe('1.23456789');
    expect(formatAtomicAmount('1', 8)).toBe('0.00000001');
    expect(formatAtomicAmount('123456789012345678901234567890', 8)).toBe(
      '1234567890123456789012.34567890'
    );
    expect(formatAtomicAmount('-100000000', 8)).toBe('-1.00000000');
  });
});
