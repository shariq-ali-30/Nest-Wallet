// Encrypts the recovery phrase / private key with the user's password.
// PBKDF2 (SHA-256) derives an AES-GCM key. Nothing is ever stored in plain text.

const enc = new TextEncoder();
const dec = new TextDecoder();
const ITERATIONS = 600000;

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSecret(secret, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(secret))
  );
  return { v: 1, iterations: ITERATIONS, salt: toB64(salt), iv: toB64(iv), data: toB64(data) };
}

export async function decryptSecret(encrypted, password) {
  try {
    const key = await deriveKey(password, fromB64(encrypted.salt), encrypted.iterations);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(encrypted.iv) },
      key,
      fromB64(encrypted.data)
    );
    return JSON.parse(dec.decode(plain));
  } catch {
    throw new Error('Incorrect password.');
  }
}
