import { encryptSecret, decryptSecret, isEncryptedSecret } from './encryption.util';

describe('EncryptionUtil (AES-256-GCM)', () => {
  const testKey = 'test-secret-key-32-chars-long-abc';
  const wrongKey = 'wrong-secret-key-32-chars-long-xyz';

  it('should encrypt and decrypt a plaintext secret correctly', () => {
    const secret = 'my-super-secret-smtp-password-123!@#';
    const encrypted = encryptSecret(secret, testKey);

    expect(encrypted).not.toEqual(secret);
    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(encrypted.startsWith('v1:')).toBe(true);

    const decrypted = decryptSecret(encrypted, testKey);
    expect(decrypted).toEqual(secret);
  });

  it('should produce different ciphertexts for the same plaintext due to random IV', () => {
    const secret = 'same-secret';
    const enc1 = encryptSecret(secret, testKey);
    const enc2 = encryptSecret(secret, testKey);

    expect(enc1).not.toEqual(enc2);
    expect(decryptSecret(enc1, testKey)).toEqual(secret);
    expect(decryptSecret(enc2, testKey)).toEqual(secret);
  });

  it('should throw an error when decrypting with a wrong key', () => {
    const secret = 'confidential-data';
    const encrypted = encryptSecret(secret, testKey);

    expect(() => {
      decryptSecret(encrypted, wrongKey);
    }).toThrow();
  });

  it('should throw an error when ciphertext is tampered with', () => {
    const secret = 'confidential-data';
    const encrypted = encryptSecret(secret, testKey);
    const parts = encrypted.split(':');
    // Tamper with the ciphertext component
    parts[3] = Buffer.from('tampered-ciphertext').toString('hex');
    const tampered = parts.join(':');

    expect(() => {
      decryptSecret(tampered, testKey);
    }).toThrow();
  });

  it('should return empty string when encrypting or decrypting empty string', () => {
    expect(encryptSecret('', testKey)).toBe('');
    expect(decryptSecret('', testKey)).toBe('');
  });

  it('should correctly identify encrypted strings format', () => {
    const valid = encryptSecret('test-string', testKey);
    expect(isEncryptedSecret(valid)).toBe(true);
    expect(isEncryptedSecret('plain-password')).toBe(false);
    expect(isEncryptedSecret('')).toBe(false);
  });
});
