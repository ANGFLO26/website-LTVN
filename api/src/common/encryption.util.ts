import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes auth tag

const DEV_FALLBACK_KEY = 'ltvn-dev-encryption-key-32bytes-secret!';

export function resolveEncryptionKey(explicitKey?: string | Buffer): Buffer {
  if (explicitKey instanceof Buffer && explicitKey.length === 32) {
    return explicitKey;
  }

  const rawKey =
    (typeof explicitKey === 'string' && explicitKey.trim().length > 0
      ? explicitKey.trim()
      : process.env.SETTINGS_ENCRYPTION_KEY?.trim()) || '';

  if (!rawKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SETTINGS_ENCRYPTION_KEY must be configured in production for encrypted settings.',
      );
    }
    // Deterministic dev fallback key
    return createHash('sha256').update(DEV_FALLBACK_KEY).digest();
  }

  // 64-character hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  // 32-byte base64 string
  try {
    const fromBase64 = Buffer.from(rawKey, 'base64');
    if (fromBase64.length === 32) {
      return fromBase64;
    }
  } catch {
    // Ignore base64 parse failure and derive via SHA-256
  }

  // Derive 32-byte key from arbitrary string
  return createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Output format: v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string, secretKey?: string | Buffer): string {
  if (typeof plaintext !== 'string') {
    throw new TypeError('Plaintext must be a string.');
  }
  if (plaintext === '') {
    return '';
  }

  const key = resolveEncryptionKey(secretKey);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts envelope string using AES-256-GCM.
 * Throws clean error if authentication tag mismatches or key is invalid.
 */
export function decrypt(envelope: string, secretKey?: string | Buffer): string {
  if (envelope === '') {
    return '';
  }
  if (typeof envelope !== 'string' || !envelope.startsWith('v1:')) {
    throw new Error('Invalid encrypted envelope format.');
  }

  const parts = envelope.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted envelope structure.');
  }

  const [, ivHex, tagHex, ciphertextHex] = parts;
  if (!ivHex || !tagHex || !ciphertextHex) {
    throw new Error('Corrupted encrypted envelope: missing components.');
  }

  const key = resolveEncryptionKey(secretKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Corrupted encrypted envelope: invalid component sizes.');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error(
      'Decryption failed: authentication tag mismatch or invalid encryption key.',
    );
  }
}

/**
 * Checks whether a string is a valid encrypted envelope.
 */
export function isEncryptedEnvelope(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^v1:[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(value);
}

// Aliases for convenience & test compatibility
export const encryptSecret = encrypt;
export const decryptSecret = decrypt;
export const isEncryptedSecret = isEncryptedEnvelope;

