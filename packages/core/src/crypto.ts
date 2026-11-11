import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import type { Issuer, IssuerKey, SignedEnvelope, VerificationCode, VerificationResult } from './types';

/** Deterministic JSON: object keys sorted recursively, no whitespace. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

export function sha256Hex(input: string): string {
  return bytesToHex(sha256(utf8ToBytes(input)));
}

export interface KeyPair {
  keyId: string;
  privateKeyHex: string;
  publicKeyHex: string;
}

/** Derive a key pair from a seed phrase. Used ONLY for published, worthless demo keys. */
export function demoKeyPair(keyId: string, seedPhrase: string): KeyPair {
  const priv = sha256(utf8ToBytes(seedPhrase));
  return { keyId, privateKeyHex: bytesToHex(priv), publicKeyHex: bytesToHex(ed25519.getPublicKey(priv)) };
}

export function sign<T>(payload: T, key: KeyPair): SignedEnvelope<T> {
  const msg = utf8ToBytes(canonicalJson(payload));
  const sig = ed25519.sign(msg, hexToBytes(key.privateKeyHex));
  return { payload, keyId: key.keyId, signature: bytesToHex(sig) };
}

export function verifySignature(env: SignedEnvelope<unknown>, publicKeyHex: string): boolean {
  try {
    const msg = utf8ToBytes(canonicalJson(env.payload));
    return ed25519.verify(hexToBytes(env.signature), msg, hexToBytes(publicKeyHex));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Demo issuer and publisher. These keys are public and FICTIONAL.      */
/* ------------------------------------------------------------------ */

export const DEMO_ISSUER: Issuer = {
  id: 'DEMO-ISSUER',
  name: { ar: 'جهة إصدار تجريبية (افتراضية)', en: 'Demo Issuer (fictional)' },
};

export const DEMO_ISSUER_KEY = demoKeyPair('demo-issuer-2026-01', 'SAUDI-SHIELD DEMO-ISSUER FICTIONAL KEY v1');
export const DEMO_PUBLISHER_KEY = demoKeyPair('demo-publisher-2026-01', 'SAUDI-SHIELD DEMO-PUBLISHER FICTIONAL KEY v1');
/** A key that is NOT registered: used by the simulator to show quarantine. */
export const UNREGISTERED_KEY = demoKeyPair('unknown-key-xx', 'SAUDI-SHIELD UNREGISTERED FICTIONAL KEY');

export class KeyRegistry {
  private keys = new Map<string, IssuerKey>();
  private issuers = new Map<string, Issuer>();

  addIssuer(issuer: Issuer) {
    this.issuers.set(issuer.id, issuer);
  }
  addKey(key: IssuerKey) {
    this.keys.set(key.keyId, key);
  }
  revoke(keyId: string, at: string) {
    const k = this.keys.get(keyId);
    if (k) k.revokedAt = at;
  }
  getKey(keyId: string) {
    return this.keys.get(keyId);
  }
  getIssuer(id: string) {
    return this.issuers.get(id);
  }
  listKeys() {
    return [...this.keys.values()];
  }

  /**
   * Verify an issuer envelope. `sender` in the payload must match the key's issuer.
   * Max clock skew defaults to 5 minutes into the future.
   */
  verify(env: SignedEnvelope<{ sender?: string; sent?: string }>, now: Date, maxSkewMs = 5 * 60_000): VerificationResult {
    const checkedAt = now.toISOString();
    const payloadSha256 = sha256Hex(canonicalJson(env?.payload ?? null));
    const res = (code: VerificationCode, issuerId?: string): VerificationResult => ({
      ok: code === 'OK',
      code,
      keyId: env?.keyId ?? '',
      issuerId,
      payloadSha256,
      checkedAt,
    });
    if (!env || typeof env.signature !== 'string' || typeof env.keyId !== 'string' || !env.payload) return res('MALFORMED');
    const key = this.keys.get(env.keyId);
    if (!key) return res('UNKNOWN_KEY');
    if (key.revokedAt && new Date(key.revokedAt) <= now) return res('KEY_REVOKED', key.issuerId);
    if (new Date(key.validFrom) > now) return res('KEY_NOT_YET_VALID', key.issuerId);
    if (new Date(key.validTo) < now) return res('KEY_EXPIRED', key.issuerId);
    if (env.payload.sender !== key.issuerId) return res('ISSUER_MISMATCH', key.issuerId);
    if (!verifySignature(env, key.publicKeyHex)) return res('BAD_SIGNATURE', key.issuerId);
    if (env.payload.sent && new Date(env.payload.sent).getTime() - now.getTime() > maxSkewMs)
      return res('CLOCK_SKEW', key.issuerId);
    return res('OK', key.issuerId);
  }
}

export function demoRegistry(): KeyRegistry {
  const r = new KeyRegistry();
  r.addIssuer(DEMO_ISSUER);
  r.addKey({
    keyId: DEMO_ISSUER_KEY.keyId,
    issuerId: DEMO_ISSUER.id,
    algorithm: 'Ed25519',
    publicKeyHex: DEMO_ISSUER_KEY.publicKeyHex,
    validFrom: '2026-01-01T00:00:00Z',
    validTo: '2027-12-31T23:59:59Z',
  });
  return r;
}
