# DRAFT — rad-to-rad messaging is an encrypted host seam, never core

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-08-31 |
| **Pends on** | Which crypto engine is selected. §3 names the property and the shortlist; the choice between a vendored `libsignal` build and a WebCrypto-composed ratchet is a person's, and it is the one input this record does not settle. |
| **Principle** | `seams-on-standard-protocols`; `build-the-seam-buy-the-engines`; `ownership-is-the-deliverable` |

## Context

Two people running `rad` want to drive one session from two places — a shared
control surface, one performer's cell selections appearing on another's ring.
That is the first channel between people this estate has ever proposed, and it
is the first consumer of the org record *A session between people is encrypted
end to end*.

`rad` is built to make this decision easy and to make the wrong version of it
hard. The core-extraction record splits the codebase into `core/` — pure ES
modules that a CI check forbids from touching `window`, `navigator`, the DOM,
or anything outside `core/` — and host adapters in `dom/`. The deliverable is
`index.html`, and its adoption record makes *zero network call* a mechanical,
verifiable property of that file.

Messaging must not weaken either fact. A network call in `core/` would break
the purity check; a network call in `index.html` would break the
zero-dependency claim its own record rests on. So the whole of this feature
lives in a new host seam, off to the side of both, opt-in, and carrying its
own dependency that the base deliverable never acquires.

## Decision

**rad-to-rad messaging is a host seam. It ships a `Session`, never a relay,
and every session is end-to-end encrypted with a selected engine. `core/` and
`index.html` are untouched by it.**

### §1 — Where it lives, and what stays pure

A new top-level `messaging/` holds the seam. `core/` gains nothing and its
purity check still passes; `index.html` still makes no network call and its
service inventory is still empty, because the base deliverable does not import
`messaging/`. A host that wants a shared session opts in by loading it, and a
host that does not is byte-for-byte the file it is today.

### §2 — The session carries cells, not the ring

What crosses the wire is the addressing, not the rendering: a cell index and
the intent bound to it, per the host integration standard's §2b. Two rads
render that addressing in their own themes and geometries. A session that
shipped pixels would couple two hosts' layouts and defeat the whole
platform-neutral contract; a session that ships cells is replayable against
the governed vectors.

### §3 — End to end, by a selected engine, never written here

This record adopts the org encryption record in full and relaxes nothing.
The session uses an established protocol of the Double Ratchet family — Signal's
Double Ratchet via a vendored `libsignal`, or an equivalent composed from a
platform's standard primitives (X25519 agreement, an HKDF key chain, an AEAD
seal) with published analysis behind each primitive. Per
`build-the-seam-buy-the-engines`, the ratchet is an **engine, selected**;
`messaging/` composes it and does not invent it. Novel cryptography here is
forbidden, as it is estate-wide.

### §4 — rad ships no relay, and the relay is blind

`messaging/` provides a `Session` and a `Transport` interface. It provides no
server. Whatever routes two rads to each other — a rendezvous the host
supplies, a WebRTC data channel, a moat ingress — is handed sealed envelopes
and sees ciphertext, sender, recipient, and timing, and no content. A relay
that could read a session would be an operator reading a performance, which
the org record §3 forbids.

### §5 — Device identity is the host's, and it is not the operator's

A ratchet binds to device keys. `messaging/` defines the device-key interface
and generates a keypair; it does **not** define how a person trusts another
person's device. That is the host's, and it must not be moat's operator
identity — the org record's Consequences name this as the open design work,
and this record inherits it rather than pretending to close it.

### §6 — Conformance runs, or the claim is empty

`messaging/` ships an executable conformance surface, in the exact spirit of
`conformance/vectors.json`: a key-agreement transcript a second implementation
replays, a symmetric-ratchet chain shown to advance and discard spent keys,
and — the clause that makes the encryption real rather than asserted — a relay
handed the session log and demonstrated **unable to decrypt it**. `npm run
test:messaging` runs it. An encryption layer never seen to withhold content is
a claim, per the charter's evidence principle.

### §7 — Downstream hosts adopt the seam, not a reimplementation

`rad` is a contract with more than one host, and the session is part of that
contract. A host does not write its own messaging; it loads `messaging/` and
supplies the two things rad refuses to ship — a transport and a device-trust
decision. Three hosts are in view and each adopts the same `Session`:

- **codecartographer** already vendors rad's core and runs its conformance
  vectors in its own web runner. A shared code-map session — two people
  driving one graph — is the same `Session` over a browser transport
  (a WebRTC data channel or a moat-fronted relay), with WebCrypto standing in
  for `node:crypto` behind the identical interface.
- **a native Android host of rad** — referenced as `private-35`, because its
  name is a private repository and this record is public — adopts the same
  `Session` with the platform's own keystore for device keys and its own
  transport. The engine it selects is the Android-native binding of the same
  ratchet family, not a second protocol.
- **the reference host** (`index.html`) adopts nothing by default: it is the
  zero-network deliverable, and messaging stays opt-in there as everywhere.

The rule this makes explicit: **`messaging/` is the one implementation, and a
host's freedom is the transport and the trust root, never the protocol.** A
host that forked the session logic would fork the estate's encryption
guarantee, which is the divergence `seams-on-standard-protocols` exists to
prevent. The conformance surface in §6 is what a downstream host replays to
show it adopted the seam rather than approximated it — the same way its rad
port replays `conformance/vectors.json` to show it drew the contract's menu.

## Consequences

**The base deliverable does not change, and that is the point.** The whole
feature is additive and opt-in; a host that never loads `messaging/` inherits
no dependency, no network call, and no crypto surface to get wrong.

**A dependency arrives, in the seam and nowhere else.** The selected engine is
`messaging/`'s dependency. The adoption record's zero-dependency clause is
about `index.html`; this record is the reason that clause now reads "the
deliverable" rather than "the project", and the two do not conflict.

**Session resumption, out-of-order delivery, and multi-party are deferred, not
denied.** The first cut is two devices, in order, one session. Groups follow
the org record §4 (re-key on membership) when a third rad wants in, and get
their own section then rather than a hedge now.

## Alternatives considered

**Put messaging in `core/`.** Rejected by the purity check it would break, and
rightly: the reference implementation of the addressing contract must stay
runnable in Node with no browser and no wire.

**Ship a relay with rad.** Rejected. A relay is infrastructure — moat's
domain — and shipping one would make rad reach a service at runtime, the exact
revision trigger its adoption record names. rad ships the blind endpoints; the
wire between them is the host's to provide.

**Send rendered state, not cells.** Simpler to build and it couples two hosts'
themes forever. The cell is the seam the whole contract is built on; the
session speaks it.

**Write the ratchet on WebCrypto primitives as production code.** Tempting,
because Node and browsers ship X25519, HKDF and AES-GCM. Rejected as the
*production* path: composing a ratchet is composing a protocol, and a protocol
without published analysis is the unexercisable claim the org record forbids.
A WebCrypto composition is acceptable only as the demonstrated conformance
surface of §6, clearly labelled as such, with the production engine selected.

## Revision triggers

- The engine is selected. The `Pends on` closes and §6's transcript is pinned
  to that engine's outputs.
- A third participant. §4 grows a group section under the org record's group
  clause.
- The device-trust question from §5 gets an answer anywhere in the estate.
  Messaging adopts it rather than inventing a second one.

## Amendments

*(none)*
