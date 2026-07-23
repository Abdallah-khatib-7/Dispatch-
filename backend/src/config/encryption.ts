import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from './env.ts';

// AES-256-GCM. One random 12-byte IV and one 16-byte auth tag per encrypted
// field, stored alongside the ciphertext (all hex). The 32-byte key comes from
// TOKEN_ENCRYPTION_KEY. Never log or return plaintext from this module's callers.

const KEY = Buffer.from(env.tokenEncryptionKey, 'hex');
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

export interface EncryptedField {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export const encryptField = (plaintext: string): EncryptedField => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
};

export const decryptField = (field: EncryptedField): string => {
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(field.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(field.authTag, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(field.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
};
