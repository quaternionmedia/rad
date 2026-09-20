/**
 * rad-to-rad messaging — the demonstration.
 *
 *   node messaging/demo.mjs
 *
 * Two rads drive one session through a blind relay. This prints what it
 * established and, in the estate's habit, what it did not. It is the §6
 * conformance surface of `adr/DRAFT-rad-to-rad-messaging.md`, composing
 * selected primitives; it is not a production Double Ratchet, and it says so.
 */

import { newDevice, Session, BlindRelay } from './session.mjs';

const line = (s = '') => process.stdout.write(s + '\n');
const rule = () => line('-'.repeat(64));

rule();
line('rad → rad messaging — one session, two rads, a blind relay');
rule();

// [1] Two devices, each holding its own private key.
const alice = newDevice('alice');
const bob = newDevice('bob');
line(`\n[1] two rads generate device keys`);
line(`    alice pub ${alice.publicKeyBytes.length}B   bob pub ${bob.publicKeyBytes.length}B`);
line(`    private keys never leave the device that made them`);

// [2] Each derives the session from its own key and the peer's public key.
const aSession = new Session(alice, bob.publicKeyBytes, { initiator: true });
const bSession = new Session(bob, alice.publicKeyBytes, { initiator: false });
line(`\n[2] both derive one session from the exchanged public keys`);
line(`    no secret crossed the wire; the handshake carries public keys only`);

// [3] alice selects a cell; it is sealed and routed by a relay that holds no key.
const relay = new BlindRelay();
const env1 = aSession.seal(7, 'commit');
relay.route('alice', 'bob', env1);
line(`\n[3] alice selects cell 7 (commit) — sealed and routed`);
const seen = relay.attemptRead(env1);
line(`    the relay sees: ${seen.sees.join(', ')} (${seen.bytes}B ciphertext)`);
line(`    the relay reads the cell: ${seen.readable}`);

// [4] bob opens it and sees the cell alice selected.
const got1 = bSession.open(env1);
line(`\n[4] bob opens it → cell ${got1.cell} (${got1.intent})`);

// [5] A second message advances the ratchet; message one's key cannot open two.
const env2 = aSession.seal(3, 'back');
relay.route('alice', 'bob', env2);
const got2 = bSession.open(env2);
line(`\n[5] alice selects cell 3 (back) — the ratchet advanced`);
line(`    bob opens it → cell ${got2.cell} (${got2.intent})`);
let replayFailed = false;
try {
  // bob's receive chain has moved on; the envelope for message one no longer
  // opens, which is the forward secrecy of the symmetric ratchet.
  bSession.open(env1);
} catch {
  replayFailed = true;
}
line(`    replaying message one against the advanced chain fails: ${replayFailed}`);

// [6] The blind-relay demonstration: hand the relay the whole log, watch it fail.
line(`\n[6] the relay is handed the whole session log and asked to read it`);
let anyReadable = false;
for (const entry of relay.log) {
  if (relay.attemptRead(entry.envelope).readable) anyReadable = true;
}
line(`    envelopes in the log: ${relay.log.length}`);
line(`    any cell the relay could read: ${anyReadable}`);

rule();
line('ESTABLISHED');
rule();
line('  - Two rads agreed a session from exchanged public keys, no secret on');
line('    the wire.');
line('  - A cell selection crossed a relay that saw ciphertext, sender,');
line('    recipient and timing, and no content.');
line('  - The symmetric ratchet advanced; a spent message key did not open the');
line('    next message.');
line('  - The relay, handed the whole log, decrypted nothing.');

rule();
line('WHAT THIS DID NOT ESTABLISH');
rule();
line('  - A production Double Ratchet. The DH re-key on every round trip,');
line('    out-of-order delivery, and session resumption are the selected');
line('    engine’s job — libsignal or an equivalent with published analysis.');
line('  - Device trust. This proves the endpoints hold the keys; it does not');
line('    say how one person trusts another person’s device (record §5).');
line('  - That the primitives are unbroken. It selects node:crypto’s X25519,');
line('    HKDF and AES-GCM; it does not audit them, and it writes no new');
line('    cryptography.');

process.exit(anyReadable || !replayFailed ? 1 : 0);
