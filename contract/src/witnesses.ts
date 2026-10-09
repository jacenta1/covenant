// SPDX-License-Identifier: Apache-2.0
//
// Off-chain secrets each party feeds into covenant circuits. Every witness is
// a pure read of one field of the caller's private book; none mutate it.

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger, LoanTerms, Witnesses } from './managed/covenant/contract/index.js';

/** Private book held by a single desk participant. Never leaves the client. */
export type DeskSecrets = {
  readonly privateKey: Uint8Array;
  readonly loanTerms: LoanTerms;
  readonly loanSalt: Uint8Array;
  readonly collateralSalt: Uint8Array;
};

const ZERO_SALT = (): Uint8Array => new Uint8Array(32);

/** Reference facility: 10k borrowed against 200 units, 150% maintenance. */
export const baselineTerms = (): LoanTerms => ({
  currency: 1n,
  borrowAmount: 10_000n,
  collateralAmount: 200n,
  minRatioBps: 15_000n,
  dueTimestamp: 50_000n,
});

export function makeSecrets(
  privateKey: Uint8Array,
  overrides: Partial<LoanTerms> = {},
  loanSalt: Uint8Array = ZERO_SALT(),
  collateralSalt: Uint8Array = ZERO_SALT(),
): DeskSecrets {
  return { privateKey, loanSalt, collateralSalt, loanTerms: { ...baselineTerms(), ...overrides } };
}

type Ctx = WitnessContext<Ledger, DeskSecrets>;

function pick<K extends keyof DeskSecrets>(field: K) {
  return (ctx: Ctx): [DeskSecrets, DeskSecrets[K]] => [ctx.privateState, ctx.privateState[field]];
}

export const deskWitnesses: Witnesses<DeskSecrets> = {
  privateKey: pick('privateKey'),
  loanTerms: pick('loanTerms'),
  loanSalt: pick('loanSalt'),
  collateralSalt: pick('collateralSalt'),
};
