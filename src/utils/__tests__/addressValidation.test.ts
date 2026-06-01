import { describe, it, expect } from 'vitest';
import { validateLtcAddress } from '../addressValidation';

describe('addressValidation', () => {
  describe('validateLtcAddress', () => {
    describe('valid addresses', () => {
      it('should accept P2PKH addresses starting with L', () => {
        expect(validateLtcAddress('LXjfhJaYMBRtqCCNFdUmYzxvvGTgPQAmZM')).toBe(true);
        expect(validateLtcAddress('LcHK4Z4kTbTyEAasFd2mYNe7hfFaRP1Qpf')).toBe(true);
        expect(validateLtcAddress('LcBu5nWpGyL5FzXR4Urtmqk5unHhEEKPbx')).toBe(true);
        expect(validateLtcAddress('LN8hQaoX9fESwL58Zfi6fWannJ2rHyHVVQ')).toBe(true);
      });

      it('should accept P2SH addresses starting with M', () => {
        expect(validateLtcAddress('MJKuCRJmLjFSwvsrkPPcTGSxqPQgmwRNkR')).toBe(true);
        expect(validateLtcAddress('MAVWzxXm8KGhJRfNqwx9JvBPpvSTUaJPfk')).toBe(true);
        expect(validateLtcAddress('MEV94kafEdkZn222q6TLnZzwt3GGz6w2J5')).toBe(true);
        expect(validateLtcAddress('MQW3uugVsdBLj48xuV2ygqF15RcYshFfKs')).toBe(true);
      });

      it('should accept Bech32 P2WPKH addresses (ltc1q...)', () => {
        // Standard 43-character P2WPKH address
        expect(validateLtcAddress('ltc1q9kk0zvwglnw6twj7xj2j5qt94afc42l5pm7aj9')).toBe(true);
        expect(validateLtcAddress('ltc1qhkfq3zahaqkkzx5mjnamwjsfpq2jk7z0tamvsu')).toBe(true);
        expect(validateLtcAddress('ltc1quex4vj4w8wj7alxa9eh0fxcep4cqlwhegaqd2t')).toBe(true);
      });

      it('should accept Bech32 P2WSH addresses (ltc1q... longer)', () => {
        // 62-character P2WSH address
        expect(validateLtcAddress('ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kgmn4n9')).toBe(true);
      });

      it('should accept Bech32 Taproot addresses (ltc1p...)', () => {
        // P2TR (Taproot) addresses start with ltc1p and are 62 characters
        expect(validateLtcAddress('ltc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqdmchcc')).toBe(true);
      });

      it('should accept addresses with leading/trailing whitespace', () => {
        expect(validateLtcAddress('  ltc1q9kk0zvwglnw6twj7xj2j5qt94afc42l5pm7aj9  ')).toBe(true);
        expect(validateLtcAddress('\tLXjfhJaYMBRtqCCNFdUmYzxvvGTgPQAmZM\n')).toBe(true);
      });
    });

    describe('invalid addresses', () => {
      it('should reject empty strings', () => {
        expect(validateLtcAddress('')).toBe(false);
        expect(validateLtcAddress('   ')).toBe(false);
      });

      it('should reject addresses with invalid prefixes', () => {
        expect(validateLtcAddress('1XjfhJaYMBRtqCCNFdUmYzxvvGTgPQAmZM')).toBe(false); // BTC-style
        expect(validateLtcAddress('3JKuCRJmLjFSwvsrkPPcTGSxqPQgmwRNkR')).toBe(false); // BTC-style
        expect(validateLtcAddress('bc1qhkfq3zahaqkkzx5mjnamwjsfpq2jk7z0wluxhr')).toBe(false); // BTC Bech32
      });

      it('should reject Bech32 addresses with invalid characters (1, b, i, o)', () => {
        // These contain invalid Bech32 characters
        expect(validateLtcAddress('ltc1q770u3ctquh2yee7uc3at9mvjnl04cf6myj2l91')).toBe(false); // contains '1'
        expect(validateLtcAddress('ltc1q770u3ctquh2yee7uc3at9mvjnl04cf6myj2l9b')).toBe(false); // contains 'b'
        expect(validateLtcAddress('ltc1q770u3ctquh2yee7uc3at9mvjnl04cf6myj2l9i')).toBe(false); // contains 'i'
        expect(validateLtcAddress('ltc1q770u3ctquh2yee7uc3at9mvjnl04cf6myj2l9o')).toBe(false); // contains 'o'
      });

      it('should reject addresses that are too short', () => {
        expect(validateLtcAddress('ltc1q770u3ctquh2yee7uc3at9mvjnl04cf6m')).toBe(false);
        expect(validateLtcAddress('LXjfhJaYMBRtqCCNFdUm')).toBe(false);
      });

      it('should reject addresses that are too long', () => {
        expect(validateLtcAddress('LXjfhJaYMBRtqCCNFdUmYzxvvGTgPQAmZMextra')).toBe(false);
      });

      it('should reject addresses with uppercase in Bech32 part', () => {
        expect(validateLtcAddress('ltc1Q9kk0zvwglnw6twj7xj2j5qt94afc42l5pm7aj9')).toBe(false);
      });

      it('should reject random strings', () => {
        expect(validateLtcAddress('notanaddress')).toBe(false);
        expect(validateLtcAddress('12345678901234567890123456789012345')).toBe(false);
      });
    });
  });
});
