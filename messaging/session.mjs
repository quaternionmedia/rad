/**
 * rad-to-rad messaging — the host seam.
 *
 * Per `adr/DRAFT-rad-to-rad-messaging.md`: this lives outside `core/` and
 * outside `index.html`, so the pure core stays pure and the base deliverable
 * still makes no network call. What crosses the wire is a cell and its intent,
 * not rendered pixels.
 *
 * **THE CRYPTO IS A SELECTED ENGINE, COMPOSED HERE, NOT INVENTED HERE.** This
 * engine composes `node:crypto`'s standard, published primitives — X25519 key
 * agreement, an HKDF key chain, AES-256-GCM sealing. It is the §6 conformance
 * surface of the record, and it is honest about being that and not a
 * production Double Ratchet: it demonstrates the *properties* a conformant
 * session must have (endpoint-held keys, a forward-secret symmetric ratchet, a
 * relay that cannot read), and it does not implement the DH re-key on every
 * round trip, out-of-order handling, or session resumption. The production
 * path selects `libsignal` or an equivalent with published analysis, behind
 * this same `Session` interface. `adr/DRAFT-rad-to-rad-messaging.md` §3.
 */

import {
  generateKeyPairSync,
  diffieHellman,
  createPublicKey,
  hkdfSync,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

const ENC = new TextEncoder();
const DEC = new TextDecoder();

/** A device identity: an X25519 keypair. The private key never leaves here. */
export function newDevice(name) {
  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  return {
    name,
    privateKey,
    // The wire form of the public key — what a peer needs to agree a secret.
    publicKeyBytes: publicKey.export({ type: 'spki', format: 'der' }),
  };
}

function sharedSecret(device, peerPublicKeyBytes) {
  const publicKey = createPublicKey({
    key: Buffer.from(peerPublicKeyBytes),
    type: 'spki',
    format: 'der',
  });
  return diffieHellman({ privateKey: device.privateKey, publicKey });
}

function kdf(keyMaterial, salt, info, length = 32) {
  return Buffer.from(hkdfSync('sha256', keyMaterial, salt, ENC.encode(info), length));
}

/**
 * One end of a session. Constructed from this device and the peer's public
 * key; both ends derive the same root, so the handshake carries no secret.
 */
export class Session {
  constructor(device, peerPublicKeyBytes, { initiator }) {
    const secret = sharedSecret(device, peerPublicKeyBytes);
    // A fixed salt derived from both public keys keeps the two ends symmetric
    // without a round trip. A production engine ratchets the root on every DH;
    // this fixes it, which is the simplification §6 declares.
    this.root = kdf(secret, Buffer.alloc(32), 'rad-messaging/root');
    // Separate send and receive chains, assigned by role so the two ends line
    // up: the initiator sends on chain A and receives on chain B.
    this.sendChain = kdf(this.root, ENC.encode(initiator ? 'A' : 'B'), 'chain');
    this.recvChain = kdf(this.root, ENC.encode(initiator ? 'B' : 'A'), 'chain');
    this.sendCount = 0;
    this.recvCount = 0;
  }

  // The symmetric ratchet: each step derives a message key and the next chain
  // key, and the spent chain key is overwritten. A key recovered from one
  // message cannot open the next, which is the forward secrecy §6 asserts.
  #step(chainName) {
    const chain = this[chainName];
    const messageKey = kdf(chain, Buffer.alloc(1, 0x01), 'message-key');
    this[chainName] = kdf(chain, Buffer.alloc(1, 0x02), 'chain-key');
    chain.fill(0);
    return messageKey;
  }

  /** Seal one cell selection for the peer. Returns an opaque envelope. */
  seal(cell, intent) {
    const key = this.#step('sendChain');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = ENC.encode(JSON.stringify({ cell, intent, n: this.sendCount++ }));
    const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    key.fill(0);
    return {
      iv: iv.toString('base64'),
      body: body.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
    };
  }

  /** Open the peer's envelope. Throws if it was tampered with or out of turn. */
  open(envelope) {
    const key = this.#step('recvChain');
    const decipher = createDecipheriv(
      'aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.body, 'base64')),
      decipher.final(),
    ]);
    key.fill(0);
    this.recvCount++;
    return JSON.parse(DEC.decode(plaintext));
  }
}

/**
 * A relay routes envelopes and holds no keys. It is what §4 says rad never
 * ships and what §6 demonstrates blind: it can store, forward, and see
 * sender/recipient/timing, and it cannot read a cell.
 */
export class BlindRelay {
  constructor() {
    this.log = [];
  }

  route(from, to, envelope) {
    this.log.push({ from, to, at: Date.now(), envelope });
    return envelope;
  }

  /** What the relay can see: metadata, never content. */
  attemptRead(envelope) {
    // It has the ciphertext and no key. The most it can do is observe size.
    return { readable: false, sees: ['iv', 'ciphertext', 'tag'], bytes: envelope.body.length };
  }
}
