/**
 * rad-to-rad messaging — the conformance suite.
 *
 *   node --test messaging/
 *
 * §6 of `adr/DRAFT-rad-to-rad-messaging.md` says an encryption layer never seen
 * to withhold content is a claim, not a fact. These tests are where it is seen
 * to withhold: a relay handed the log decrypts nothing, a spent key does not
 * open the next message, and a tampered envelope is refused.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { newDevice, Session, BlindRelay } from './session.mjs';

function pair() {
  const alice = newDevice('alice');
  const bob = newDevice('bob');
  return {
    a: new Session(alice, bob.publicKeyBytes, { initiator: true }),
    b: new Session(bob, alice.publicKeyBytes, { initiator: false }),
  };
}

test('a sealed cell round-trips to the peer', () => {
  const { a, b } = pair();
  const got = b.open(a.seal(7, 'commit'));
  assert.equal(got.cell, 7);
  assert.equal(got.intent, 'commit');
});

test('the two ends agree a session with no secret on the wire', () => {
  // The only thing that crossed is the public key bytes; a session still opens.
  const alice = newDevice('alice');
  const bob = newDevice('bob');
  const a = new Session(alice, bob.publicKeyBytes, { initiator: true });
  const b = new Session(bob, alice.publicKeyBytes, { initiator: false });
  assert.deepEqual(b.open(a.seal(1, 'x')), { cell: 1, intent: 'x', n: 0 });
});

test('the relay, handed the log, decrypts nothing', () => {
  // **THE CLAUSE THAT MAKES THE ENCRYPTION REAL RATHER THAN ASSERTED.**
  const { a } = pair();
  const relay = new BlindRelay();
  relay.route('alice', 'bob', a.seal(7, 'commit'));
  relay.route('alice', 'bob', a.seal(3, 'back'));
  for (const entry of relay.log) {
    assert.equal(relay.attemptRead(entry.envelope).readable, false);
  }
});

test('a spent message key does not open the next message', () => {
  // Forward secrecy of the symmetric ratchet: the chain advanced, so the
  // envelope for message one no longer opens against it.
  const { a, b } = pair();
  const one = a.seal(7, 'commit');
  const two = a.seal(3, 'back');
  b.open(one);
  b.open(two);
  assert.throws(() => b.open(one));
});

test('a tampered envelope is refused, not silently accepted', () => {
  const { a, b } = pair();
  const env = a.seal(7, 'commit');
  const flipped = Buffer.from(env.body, 'base64');
  flipped[0] ^= 0x01;
  assert.throws(() => b.open({ ...env, body: flipped.toString('base64') }));
});

test('what crosses the wire is a cell, never rendered state', () => {
  // §2: the payload is addressing, so it replays against the governed vectors
  // rather than coupling two hosts' layouts.
  const { a, b } = pair();
  const got = b.open(a.seal(5, 'open'));
  assert.deepEqual(Object.keys(got).sort(), ['cell', 'intent', 'n']);
});
