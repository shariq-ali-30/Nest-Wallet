import { Mnemonic, Wallet } from 'ethers';

export function walletFromSecret(secret) {
  return secret.kind === 'mnemonic' ? Wallet.fromPhrase(secret.value) : new Wallet(secret.value);
}

export function parseSecretInput(kind, input) {
  if (kind === 'mnemonic') {
    const phrase = input.trim().toLowerCase().split(/\s+/).join(' ');
    if (!Mnemonic.isValidMnemonic(phrase)) {
      throw new Error('This recovery phrase is not valid. Check the words and their order.');
    }
    return { kind: 'mnemonic', value: phrase };
  }
  let key = input.trim();
  if (!key.startsWith('0x')) key = `0x${key}`;
  try {
    new Wallet(key);
  } catch {
    throw new Error('This private key is not valid.');
  }
  return { kind: 'privateKey', value: key };
}
