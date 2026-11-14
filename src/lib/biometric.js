const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function fromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
function toBase64Url(bytes) {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return fromBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
}
function ensureSupport() {
  if (!globalThis.isSecureContext) {
    throw new Error('Biometric unlock ke liye secure HTTPS website zaroori hai.');
  }
  if (!navigator.credentials?.create || !navigator.credentials?.get) {
    throw new Error('Is browser mein passkey/biometric unlock supported nahi hai. Password se unlock karein.');
  }
}
async function deriveWrappingKey(prfOutput, salt) {
  const material = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({
    name: 'HKDF',
    hash: 'SHA-256',
    salt,
    info: enc.encode('Nest Wallet biometric password wrapping v1'),
  }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function evaluateCredential(credentialId, salt) {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'required',
      timeout: 60000,
      extensions: { prf: { eval: { first: salt } } },
    },
  });
  if (!assertion) throw new Error('Biometric verification cancel ho gayi.');
  const result = assertion.getClientExtensionResults()?.prf?.results?.first;
  if (!result) throw new Error('Authenticator is tarah ka biometric unlock support nahi karta. Password se unlock karein.');
  return new Uint8Array(result);
}
export async function createBiometricCredential({ password, address, name }) {
  ensureSupport();
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Nest Wallet', id: location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(24)),
        name: address.toLowerCase(),
        displayName: name + ' (' + address.slice(0, 8) + ')',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
      extensions: { prf: { eval: { first: salt } } },
    },
  });
  if (!credential) throw new Error('Biometric setup complete nahi ho saka.');
  // Some authenticators only evaluate PRF during authentication, not registration.
  // The assertion below is the actual capability check.
  const prfOutput = await evaluateCredential(credential.rawId, salt);
  const key = await deriveWrappingKey(prfOutput, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(password));
  return {
    version: 1,
    credentialId: toBase64Url(credential.rawId),
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(ciphertext),
  };
}
export async function decryptBiometricPassword(record) {
  ensureSupport();
  if (!record || record.version !== 1) throw new Error('Biometric setup invalid hai. Password se unlock karein.');
  try {
    const salt = fromBase64(record.salt);
    const output = await evaluateCredential(fromBase64Url(record.credentialId), salt);
    const key = await deriveWrappingKey(output, salt);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(record.iv) }, key, fromBase64(record.data));
    return dec.decode(plaintext);
  } catch (error) {
    if (error?.name === 'NotAllowedError') {
      throw new Error('Biometric verification cancel hui ya authenticator available nahi. Password se unlock karein.');
    }
    if (error?.name === 'OperationError') {
      throw new Error('Biometric credential verify nahi ho saki. Password se unlock karein.');
    }
    throw error;
  }
}
