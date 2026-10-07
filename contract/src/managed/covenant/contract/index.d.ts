import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum LoanStatus { pending = 0,
                         funded = 1,
                         liquidated = 2,
                         repaid = 3,
                         defaulted = 4
}

export type LoanTerms = { borrowAmount: bigint;
                          collateralAmount: bigint;
                          minRatioBps: bigint;
                          dueTimestamp: bigint;
                          currency: bigint
                        };

export type LoanRecord = { borrower: Uint8Array;
                           lender: Uint8Array;
                           arbiter: Uint8Array;
                           termsCommitment: Uint8Array;
                           status: LoanStatus;
                           createdAt: bigint;
                           dueTimestamp: bigint;
                           minRatioBps: bigint;
                           currency: bigint
                         };

export type Witnesses<PS> = {
  privateKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  loanTerms(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, LoanTerms];
  loanSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  collateralSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerOracle(context: __compactRuntime.CircuitContext<PS>,
                 oraclePublic_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  registerCustodian(context: __compactRuntime.CircuitContext<PS>,
                    custodianPublic_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  postPrice(context: __compactRuntime.CircuitContext<PS>,
            currency_0: bigint,
            price_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  attestCollateral(context: __compactRuntime.CircuitContext<PS>,
                   borrowerPublic_0: Uint8Array,
                   currency_0: bigint,
                   commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  requestLoan(context: __compactRuntime.CircuitContext<PS>,
              loanId_0: Uint8Array,
              borrowerPublic_0: Uint8Array,
              lenderPublic_0: Uint8Array,
              arbiterPublic_0: Uint8Array,
              timestamp_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  fundLoan(context: __compactRuntime.CircuitContext<PS>, loanId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  repayLoan(context: __compactRuntime.CircuitContext<PS>, loanId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  triggerLiquidation(context: __compactRuntime.CircuitContext<PS>,
                     loanId_0: Uint8Array,
                     liquidationHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
}

export type ProvableCircuits<PS> = {
  registerOracle(context: __compactRuntime.CircuitContext<PS>,
                 oraclePublic_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  registerCustodian(context: __compactRuntime.CircuitContext<PS>,
                    custodianPublic_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  postPrice(context: __compactRuntime.CircuitContext<PS>,
            currency_0: bigint,
            price_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  attestCollateral(context: __compactRuntime.CircuitContext<PS>,
                   borrowerPublic_0: Uint8Array,
                   currency_0: bigint,
                   commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  requestLoan(context: __compactRuntime.CircuitContext<PS>,
              loanId_0: Uint8Array,
              borrowerPublic_0: Uint8Array,
              lenderPublic_0: Uint8Array,
              arbiterPublic_0: Uint8Array,
              timestamp_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  fundLoan(context: __compactRuntime.CircuitContext<PS>, loanId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  repayLoan(context: __compactRuntime.CircuitContext<PS>, loanId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  triggerLiquidation(context: __compactRuntime.CircuitContext<PS>,
                     loanId_0: Uint8Array,
                     liquidationHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
}

export type PureCircuits = {
  borrowerKey(sk_0: Uint8Array): Uint8Array;
  lenderKey(sk_0: Uint8Array): Uint8Array;
  arbiterKey(sk_0: Uint8Array): Uint8Array;
  oracleKey(sk_0: Uint8Array): Uint8Array;
  custodianKey(sk_0: Uint8Array): Uint8Array;
  loanCommitment(terms_0: LoanTerms, borrower_0: Uint8Array, salt_0: Uint8Array): Uint8Array;
  collateralCommitment(borrower_0: Uint8Array,
                       currency_0: bigint,
                       amount_0: bigint,
                       salt_0: Uint8Array): Uint8Array;
  attestationRecordKey(borrower_0: Uint8Array, currency_0: bigint): Uint8Array;
  covenantNullifier(salt_0: Uint8Array, loanId_0: Uint8Array): Uint8Array;
  settlementReceipt(commitment_0: Uint8Array, recipient_0: Uint8Array): Uint8Array;
  meetsCovenantRatio(collateral_0: bigint,
                     price_0: bigint,
                     borrow_0: bigint,
                     minRatioBps_0: bigint): boolean;
}

export type Circuits<PS> = {
  borrowerKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  lenderKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  arbiterKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  oracleKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  custodianKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  loanCommitment(context: __compactRuntime.CircuitContext<PS>,
                 terms_0: LoanTerms,
                 borrower_0: Uint8Array,
                 salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  collateralCommitment(context: __compactRuntime.CircuitContext<PS>,
                       borrower_0: Uint8Array,
                       currency_0: bigint,
                       amount_0: bigint,
                       salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  attestationRecordKey(context: __compactRuntime.CircuitContext<PS>,
                       borrower_0: Uint8Array,
                       currency_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  covenantNullifier(context: __compactRuntime.CircuitContext<PS>,
                    salt_0: Uint8Array,
                    loanId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  settlementReceipt(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array,
                    recipient_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  meetsCovenantRatio(context: __compactRuntime.CircuitContext<PS>,
                     collateral_0: bigint,
                     price_0: bigint,
                     borrow_0: bigint,
                     minRatioBps_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  registerOracle(context: __compactRuntime.CircuitContext<PS>,
                 oraclePublic_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  registerCustodian(context: __compactRuntime.CircuitContext<PS>,
                    custodianPublic_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  postPrice(context: __compactRuntime.CircuitContext<PS>,
            currency_0: bigint,
            price_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  attestCollateral(context: __compactRuntime.CircuitContext<PS>,
                   borrowerPublic_0: Uint8Array,
                   currency_0: bigint,
                   commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  requestLoan(context: __compactRuntime.CircuitContext<PS>,
              loanId_0: Uint8Array,
              borrowerPublic_0: Uint8Array,
              lenderPublic_0: Uint8Array,
              arbiterPublic_0: Uint8Array,
              timestamp_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  fundLoan(context: __compactRuntime.CircuitContext<PS>, loanId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  repayLoan(context: __compactRuntime.CircuitContext<PS>, loanId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  triggerLiquidation(context: __compactRuntime.CircuitContext<PS>,
                     loanId_0: Uint8Array,
                     liquidationHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
}

export type Ledger = {
  readonly admin: Uint8Array;
  certifiedOracles: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  certifiedCustodians: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  assetPrices: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  attestedCollateralRegistry: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  loans: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): LoanRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, LoanRecord]>
  };
  readonly loanCount: bigint;
  settlementNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  liquidationProofs: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
}

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
export declare const circuitSignatures: __compactRuntime.CircuitSignatures;
export declare const declaredInterfaces: __compactRuntime.DeclaredInterfaces;
