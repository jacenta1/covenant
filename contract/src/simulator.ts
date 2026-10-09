// SPDX-License-Identifier: Apache-2.0
//
// In-process bench for the covenant contract. One CovenantBench owns the public
// ledger state; each party gets a Seat carrying its own private book. Circuit
// calls are threaded through `dispatch`, which advances shared state and the
// caller's private state in one step and records every witness disclosure.

import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
  type CircuitResults,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  ledger as decodeLedger,
  type Ledger,
  type LoanTerms,
  type Witnesses,
} from './managed/covenant/contract/index.js';
import { deskWitnesses, makeSecrets, type DeskSecrets } from './witnesses.js';

type ChainState = Parameters<typeof createCircuitContext<DeskSecrets>>[0]['contractState'];
type Impure = Contract<DeskSecrets>['impureCircuits'];
type Body<R> = (
  k: Contract<DeskSecrets>,
  ctx: CircuitContext<DeskSecrets>,
) => Promise<CircuitResults<DeskSecrets, R>>;

const NULL_COIN_KEY = '00'.repeat(32);

export type Disclosure = { readonly witness: string; readonly value: unknown };

export class Seat {
  constructor(
    private readonly bench: CovenantBench,
    public book: DeskSecrets,
  ) {}

  private send<N extends keyof Impure>(name: N, ...args: unknown[]) {
    type Out = Awaited<ReturnType<Impure[N]>>['result'];
    return this.bench.dispatch<Out>(this, name, (k, ctx) =>
      (k.impureCircuits[name] as (...a: unknown[]) => Promise<CircuitResults<DeskSecrets, Out>>)(
        ctx,
        ...args,
      ),
    );
  }

  registerOracle = (oraclePublic: Uint8Array) => this.send('registerOracle', oraclePublic);
  registerCustodian = (custodianPublic: Uint8Array) => this.send('registerCustodian', custodianPublic);
  postPrice = (currency: bigint, price: bigint) => this.send('postPrice', currency, price);
  attestCollateral = (borrowerPublic: Uint8Array, currency: bigint, commitment: Uint8Array) =>
    this.send('attestCollateral', borrowerPublic, currency, commitment);
  requestLoan = (
    id: Uint8Array,
    borrowerPublic: Uint8Array,
    lenderPublic: Uint8Array,
    arbiterPublic: Uint8Array,
    timestamp: bigint,
  ) => this.send('requestLoan', id, borrowerPublic, lenderPublic, arbiterPublic, timestamp);
  fundLoan = (id: Uint8Array) => this.send('fundLoan', id);
  repayLoan = (id: Uint8Array) => this.send('repayLoan', id);
  triggerLiquidation = (id: Uint8Array, liquidationHash: Uint8Array) =>
    this.send('triggerLiquidation', id, liquidationHash);
}

export class CovenantBench {
  readonly address = sampleContractAddress();
  readonly disclosures: Disclosure[] = [];

  private constructor(public chain: ChainState) {}

  static async deploy(adminSecret: Uint8Array): Promise<CovenantBench> {
    const genesis = await new Contract<DeskSecrets>(deskWitnesses).initialState(
      createConstructorContext<DeskSecrets>(makeSecrets(adminSecret), NULL_COIN_KEY),
    );
    return new CovenantBench(genesis.currentContractState.data);
  }

  join(secret: Uint8Array, terms?: Partial<LoanTerms>, loanSalt?: Uint8Array, colSalt?: Uint8Array): Seat {
    return new Seat(this, makeSecrets(secret, terms, loanSalt, colSalt));
  }

  read(): Ledger {
    return decodeLedger(this.chain as Parameters<typeof decodeLedger>[0]);
  }

  async dispatch<R>(seat: Seat, circuitId: string, body: Body<R>): Promise<R> {
    const out = await body(
      this.instrumented(),
      createCircuitContext<DeskSecrets>({
        circuitId,
        contractAddress: this.address,
        coinPublicKeyOrZswapState: NULL_COIN_KEY,
        contractState: this.chain,
        privateState: seat.book,
      }),
    );
    const call = out.context.callContext;
    this.chain = call.currentQueryContext.state;
    if (call.currentPrivateState !== undefined) seat.book = call.currentPrivateState;
    return out.result;
  }

  /** A contract instance whose witnesses log what they reveal to the circuit. */
  private instrumented(): Contract<DeskSecrets> {
    const traced: Record<string, unknown> = {};
    for (const [witness, impl] of Object.entries(deskWitnesses)) {
      traced[witness] = (...a: unknown[]) => {
        const pair = (impl as (...x: unknown[]) => [DeskSecrets, unknown])(...a);
        this.disclosures.push({ witness, value: pair[1] });
        return pair;
      };
    }
    return new Contract<DeskSecrets>(traced as unknown as Witnesses<DeskSecrets>);
  }
}
