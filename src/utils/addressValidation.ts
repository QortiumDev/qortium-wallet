import { Coin } from 'qapp-core';
import { EMPTY_STRING } from '../common/constants';

/**
 * Validate Bitcoin (BTC) address format
 * Supports P2PKH (1...), P2SH (3...), and Bech32 (bc1...) addresses
 */
export const validateBtcAddress = (address: string): boolean => {
  const pattern =
    /^(1[1-9A-HJ-NP-Za-km-z]{33}|3[1-9A-HJ-NP-Za-km-z]{33}|bc1[02-9A-HJ-NP-Za-z]{39})$/;
  return pattern.test(address.trim());
};

/**
 * Validate Dogecoin (DOGE) address format
 * Supports addresses starting with 'D'
 */
export const validateDogeAddress = (address: string): boolean => {
  const pattern = /^(D[1-9A-HJ-NP-Za-km-z]{33})$/;
  return pattern.test(address.trim());
};

/**
 * Validate Litecoin (LTC) address format
 * Supports P2PKH (L...), P2SH (M...), and Bech32 (ltc1...) addresses
 * Bech32 uses charset: qpzry9x8gf2tvdw0s3jn54khce6mua7l (excludes 1, b, i, o)
 */
export const validateLtcAddress = (address: string): boolean => {
  const pattern =
    /^(L[1-9A-HJ-NP-Za-km-z]{33}|M[1-9A-HJ-NP-Za-km-z]{33}|ltc1[ac-hj-np-z02-9]{39,59})$/;
  return pattern.test(address.trim());
};

/**
 * Validate Ravencoin (RVN) address format
 * Supports addresses starting with 'R'
 */
export const validateRvnAddress = (address: string): boolean => {
  const pattern = /^(R[1-9A-HJ-NP-Za-km-z]{33})$/;
  return pattern.test(address.trim());
};

/**
 * Validate Digibyte (DGB) address format
 * Supports P2PKH (D...), P2SH (S...), and Bech32 (dgb1...) addresses
 */
export const validateDgbAddress = (address: string): boolean => {
  const pattern =
    /^(D[1-9A-HJ-NP-Za-km-z]{33}|S[1-9A-HJ-NP-Za-km-z]{33}|dgb1[2-9A-HJ-NP-Za-z]{39})$/;
  return pattern.test(address.trim());
};

/**
 * Validate Pirate Chain (ARRR) address format
 * Supports Sapling shielded addresses (zs1...)
 */
export const validateArrrAddress = (address: string): boolean => {
  const pattern = /^(zs1[a-zA-Z0-9]{75})$/;
  return pattern.test(address.trim());
};

/**
 * Validate Qortal (QORT) address format
 * Qortal uses name-based addresses or base58 addresses
 * Minimum length is 3 characters
 * Note: Full validation requires API lookup, this only checks basic format
 */
export const validateQortAddress = (address: string): boolean => {
  const trimmed = address.trim();
  // Basic validation: minimum length check
  // Full validation would require API call to verify address/name exists
  return trimmed.length >= 3;
};

/**
 * Validate address based on coin type
 * Factory function that routes to the appropriate validator
 */
export const validateAddress = (coinType: Coin, address: string): boolean => {
  if (!address || address.trim() === EMPTY_STRING) {
    return false;
  }

  switch (coinType) {
    case Coin.BTC:
      return validateBtcAddress(address);
    case Coin.DOGE:
      return validateDogeAddress(address);
    case Coin.LTC:
      return validateLtcAddress(address);
    case Coin.RVN:
      return validateRvnAddress(address);
    case Coin.DGB:
      return validateDgbAddress(address);
    case Coin.ARRR:
      return validateArrrAddress(address);
    case Coin.QORT:
      return validateQortAddress(address);
    default:
      console.warn(`Address validation not implemented for coin type: ${coinType}`);
      return false;
  }
};
