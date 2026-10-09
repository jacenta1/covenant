// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import {
  LoanStatus,
  pureCircuits,
  type LoanTerms,
} from '../../contract/src/managed/covenant/contract/index.js';
import { CovenantBench } from '../../contract/src/simulator.js';
import { CovenantDomain } from '../../contract/src/domain/covenant.js';

function randomBytes(length: number = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function makeTerms(
  borrowAmount: bigint = 10_000n,
  collateralAmount: bigint = 200n,
  minRatioBps: bigint = 15_000n,
  currency: bigint = 1n,
): LoanTerms {
  return {
    borrowAmount,
    collateralAmount,
    minRatioBps,
    dueTimestamp: 10_000n,
    currency,
  };
}

describe('Covenant Contract Real Execution', () => {
  describe('Pure Circuits & Zero-Knowledge Primitives', () => {
    it('generates domain-separated distinct keys for 5 roles from identical secret', () => {
      const sk = randomBytes(32);
      const bKey = pureCircuits.borrowerKey(sk);
      const lKey = pureCircuits.lenderKey(sk);
      const aKey = pureCircuits.arbiterKey(sk);
      const oKey = pureCircuits.oracleKey(sk);
      const cKey = pureCircuits.custodianKey(sk);

      expect(bKey).toHaveLength(32);
      expect(lKey).toHaveLength(32);
      expect(aKey).toHaveLength(32);
      expect(oKey).toHaveLength(32);
      expect(cKey).toHaveLength(32);

      const keySet = new Set([
        Buffer.from(bKey).toString('hex'),
        Buffer.from(lKey).toString('hex'),
        Buffer.from(aKey).toString('hex'),
        Buffer.from(oKey).toString('hex'),
        Buffer.from(cKey).toString('hex'),
      ]);
      expect(keySet.size).toBe(5);
    });

    it('creates deterministic loan commitments blinded by private salt', () => {
      const bPublic = randomBytes(32);
      const terms = makeTerms();
      const salt1 = randomBytes(32);
      const salt2 = randomBytes(32);

      const commit1 = pureCircuits.loanCommitment(terms, bPublic, salt1);
      const commit1Again = pureCircuits.loanCommitment(terms, bPublic, salt1);
      const commit2 = pureCircuits.loanCommitment(terms, bPublic, salt2);

      expect(commit1).toEqual(commit1Again);
      expect(commit1).not.toEqual(commit2);
    });

    it('creates deterministic custodian collateral commitments blinded by salt', () => {
      const bPublic = randomBytes(32);
      const salt1 = randomBytes(32);
      const salt2 = randomBytes(32);

      const colCommit1 = pureCircuits.collateralCommitment(bPublic, 1n, 200n, salt1);
      const colCommit1Again = pureCircuits.collateralCommitment(bPublic, 1n, 200n, salt1);
      const colCommit2 = pureCircuits.collateralCommitment(bPublic, 1n, 200n, salt2);

      expect(colCommit1).toEqual(colCommit1Again);
      expect(colCommit1).not.toEqual(colCommit2);
    });

    it('matches TypeScript domain covenant ratio check against compiled pure circuit', () => {
      const cases = [
        { c: 200n, p: 100n, b: 10_000n, r: 15_000n }, // 20000 >= 15000 -> true
        { c: 140n, p: 100n, b: 10_000n, r: 15_000n }, // 14000 < 15000 -> false
        { c: 150n, p: 100n, b: 10_000n, r: 15_000n }, // 15000 >= 15000 -> true (exact edge)
        { c: 500n, p: 50n,  b: 20_000n, r: 12_500n }, // 25000 >= 25000 -> true
        { c: 100n, p: 10n,  b: 5_000n,  r: 10_000n }, // 1000 < 5000 -> false
      ];

      for (const testCase of cases) {
        const circuitResult = pureCircuits.meetsCovenantRatio(
          testCase.c,
          testCase.p,
          testCase.b,
          testCase.r,
        );
        const tsResult = CovenantDomain.meetsCovenantRatio(
          testCase.c,
          testCase.p,
          testCase.b,
          testCase.r,
        );
        expect(circuitResult).toBe(tsResult);
      }
    });
  });

  describe('Contract State Machine & Lifecycle', () => {
    async function setupEnvironment() {
      const adminSk = randomBytes(32);
      const ledger = await CovenantBench.deploy(adminSk);

      const oracleSk = randomBytes(32);
      const custodianSk = randomBytes(32);
      const oraclePublic = pureCircuits.oracleKey(oracleSk);
      const custodianPublic = pureCircuits.custodianKey(custodianSk);

      const admin = ledger.join(adminSk);
      await admin.registerOracle(oraclePublic);
      await admin.registerCustodian(custodianPublic);

      // Post initial price of 100 for currency 1
      const oracle = ledger.join(oracleSk);
      await oracle.postPrice(1n, 100n);

      return {
        adminSk,
        oracleSk,
        custodianSk,
        oraclePublic,
        custodianPublic,
        ledger,
      };
    }

    it('deploys cleanly and allows admin to register oracle and custodian', async () => {
      const { ledger, oraclePublic, custodianPublic } = await setupEnvironment();
      const state = ledger.read();

      expect(state.certifiedOracles.member(oraclePublic)).toBe(true);
      expect(state.certifiedCustodians.member(custodianPublic)).toBe(true);
      expect(state.assetPrices.lookup(1n)).toBe(100n);
      expect(state.loanCount).toBe(0n);
    });

    it('rejects unauthorized participants from registering oracle or posting price', async () => {
      const { ledger } = await setupEnvironment();
      const impostor = ledger.join(randomBytes(32));

      await expect(
        impostor.registerOracle(randomBytes(32)),
      ).rejects.toThrow('Only admin can register oracle');

      await expect(
        impostor.postPrice(1n, 999n),
      ).rejects.toThrow('Caller not certified oracle');
    });

    it('requests a loan successfully when custodian collateral and oracle price covenant are satisfied', async () => {
      const { ledger, custodianSk } = await setupEnvironment();

      const borrowerSk = randomBytes(32);
      const lenderSk = randomBytes(32);
      const arbiterSk = randomBytes(32);

      const borrowerPublic = pureCircuits.borrowerKey(borrowerSk);
      const lenderPublic = pureCircuits.lenderKey(lenderSk);
      const arbiterPublic = pureCircuits.arbiterKey(arbiterSk);

      const terms = makeTerms(10_000n, 200n, 15_000n, 1n);
      const loanSalt = randomBytes(32);
      const colSalt = randomBytes(32);
      const loanId = randomBytes(32);

      // Custodian attests 200 collateral for borrower in currency 1
      const colCommit = pureCircuits.collateralCommitment(borrowerPublic, 1n, 200n, colSalt);
      const custodian = ledger.join(custodianSk);
      await custodian.attestCollateral(borrowerPublic, 1n, colCommit);

      // Borrower requests loan: 200 col * 100 price = 20,000 >= 10,000 * 1.5 (15,000)
      const borrower = ledger.join(borrowerSk, terms, loanSalt, colSalt);
      await borrower.requestLoan(loanId, borrowerPublic, lenderPublic, arbiterPublic, 1000n);

      const state = ledger.read();
      expect(state.loanCount).toBe(1n);
      expect(state.loans.member(loanId)).toBe(true);
      const rec = state.loans.lookup(loanId);
      expect(rec.status).toBe(LoanStatus.pending);
      expect(rec.borrower).toEqual(borrowerPublic);
      expect(rec.lender).toEqual(lenderPublic);
      expect(rec.currency).toBe(1n);
    });

    it('rejects loan request when custodian collateral attestation is missing or mismatched', async () => {
      const { ledger } = await setupEnvironment();

      const borrowerSk = randomBytes(32);
      const lenderSk = randomBytes(32);
      const loanId = randomBytes(32);

      const borrower = ledger.join(borrowerSk, makeTerms(), randomBytes(32), randomBytes(32));

      await expect(
        borrower.requestLoan(
          loanId,
          pureCircuits.borrowerKey(borrowerSk),
          pureCircuits.lenderKey(lenderSk),
          randomBytes(32),
          1000n,
        ),
      ).rejects.toThrow('No custodian collateral attestation found');
    });

    it('rejects loan request when on-chain oracle price makes collateral ratio deficient', async () => {
      const { ledger, custodianSk } = await setupEnvironment();

      const borrowerSk = randomBytes(32);
      const lenderSk = randomBytes(32);
      const loanId = randomBytes(32);
      const colSalt = randomBytes(32);
      const borrowerPublic = pureCircuits.borrowerKey(borrowerSk);

      // Borrower only deposited 100 collateral: 100 * 100 = 10,000 < 15,000 required
      const weakTerms = makeTerms(10_000n, 100n, 15_000n, 1n);
      const colCommit = pureCircuits.collateralCommitment(borrowerPublic, 1n, 100n, colSalt);

      const custodian = ledger.join(custodianSk);
      await custodian.attestCollateral(borrowerPublic, 1n, colCommit);

      const borrower = ledger.join(borrowerSk, weakTerms, randomBytes(32), colSalt);

      await expect(
        borrower.requestLoan(
          loanId,
          borrowerPublic,
          pureCircuits.lenderKey(lenderSk),
          randomBytes(32),
          1000n,
        ),
      ).rejects.toThrow('Collateral ratio below minimum threshold');
    });

    it('allows designated lender to fund pending loan', async () => {
      const { ledger, custodianSk } = await setupEnvironment();

      const borrowerSk = randomBytes(32);
      const lenderSk = randomBytes(32);
      const loanId = randomBytes(32);
      const colSalt = randomBytes(32);
      const borrowerPublic = pureCircuits.borrowerKey(borrowerSk);

      const colCommit = pureCircuits.collateralCommitment(borrowerPublic, 1n, 200n, colSalt);
      const custodian = ledger.join(custodianSk);
      await custodian.attestCollateral(borrowerPublic, 1n, colCommit);

      const borrower = ledger.join(borrowerSk, makeTerms(), randomBytes(32), colSalt);
      await borrower.requestLoan(
        loanId,
        borrowerPublic,
        pureCircuits.lenderKey(lenderSk),
        randomBytes(32),
        1000n,
      );

      const stranger = ledger.join(randomBytes(32));
      await expect(stranger.fundLoan(loanId)).rejects.toThrow('Only designated lender can fund');

      const lender = ledger.join(lenderSk);
      await lender.fundLoan(loanId);

      const state = ledger.read();
      expect(state.loans.lookup(loanId).status).toBe(LoanStatus.funded);
    });

    it('allows borrower to repay loan and issues settlement receipt with nullifier', async () => {
      const { ledger, custodianSk } = await setupEnvironment();

      const borrowerSk = randomBytes(32);
      const lenderSk = randomBytes(32);
      const loanId = randomBytes(32);
      const loanSalt = randomBytes(32);
      const colSalt = randomBytes(32);
      const terms = makeTerms();
      const borrowerPublic = pureCircuits.borrowerKey(borrowerSk);

      const colCommit = pureCircuits.collateralCommitment(borrowerPublic, 1n, 200n, colSalt);
      const custodian = ledger.join(custodianSk);
      await custodian.attestCollateral(borrowerPublic, 1n, colCommit);

      const borrower = ledger.join(borrowerSk, terms, loanSalt, colSalt);
      await borrower.requestLoan(
        loanId,
        borrowerPublic,
        pureCircuits.lenderKey(lenderSk),
        randomBytes(32),
        1000n,
      );

      const lender = ledger.join(lenderSk);
      await lender.fundLoan(loanId);

      const receipt = await borrower.repayLoan(loanId);
      expect(receipt).toHaveLength(32);

      const state = ledger.read();
      expect(state.loans.lookup(loanId).status).toBe(LoanStatus.repaid);

      await expect(borrower.repayLoan(loanId)).rejects.toThrow('Loan not active funded');
    });

    it('executes liquidation using verified on-chain oracle price feed', async () => {
      const { ledger, oracleSk, custodianSk } = await setupEnvironment();

      const borrowerSk = randomBytes(32);
      const lenderSk = randomBytes(32);
      const arbiterSk = randomBytes(32);
      const loanId = randomBytes(32);
      const loanSalt = randomBytes(32);
      const colSalt = randomBytes(32);
      const terms = makeTerms(10_000n, 200n, 15_000n, 1n);
      const borrowerPublic = pureCircuits.borrowerKey(borrowerSk);

      const colCommit = pureCircuits.collateralCommitment(borrowerPublic, 1n, 200n, colSalt);
      const custodian = ledger.join(custodianSk);
      await custodian.attestCollateral(borrowerPublic, 1n, colCommit);

      const borrower = ledger.join(borrowerSk, terms, loanSalt, colSalt);
      await borrower.requestLoan(
        loanId,
        borrowerPublic,
        pureCircuits.lenderKey(lenderSk),
        pureCircuits.arbiterKey(arbiterSk),
        1000n,
      );

      const lender = ledger.join(lenderSk, terms, loanSalt, colSalt);
      await lender.fundLoan(loanId);

      // Price on ledger is still 100 -> liquidation fails
      await expect(
        lender.triggerLiquidation(loanId, randomBytes(32)),
      ).rejects.toThrow('Covenant ratio still healthy: liquidation denied');

      // Oracle updates on-chain price to 60: 200 * 60 = 12,000 < 15,000 -> Liquidation permitted
      const oracle = ledger.join(oracleSk);
      await oracle.postPrice(1n, 60n);

      const liquidationProofHash = randomBytes(32);
      const receipt = await lender.triggerLiquidation(loanId, liquidationProofHash);
      expect(receipt).toHaveLength(32);

      const state = ledger.read();
      expect(state.loans.lookup(loanId).status).toBe(LoanStatus.liquidated);
      expect(state.liquidationProofs.lookup(loanId)).toEqual(liquidationProofHash);
    });

    it('proves zero-knowledge privacy: sensitive terms never leak to public ledger', async () => {
      const { ledger, custodianSk } = await setupEnvironment();

      const borrowerSk = randomBytes(32);
      const lenderSk = randomBytes(32);
      const loanId = randomBytes(32);
      const loanSalt = randomBytes(32);
      const colSalt = randomBytes(32);
      const terms = makeTerms(88_888n, 2_222n, 15_000n, 1n);
      const borrowerPublic = pureCircuits.borrowerKey(borrowerSk);

      const colCommit = pureCircuits.collateralCommitment(borrowerPublic, 1n, 2_222n, colSalt);
      const custodian = ledger.join(custodianSk);
      await custodian.attestCollateral(borrowerPublic, 1n, colCommit);

      const borrower = ledger.join(borrowerSk, terms, loanSalt, colSalt);
      await borrower.requestLoan(
        loanId,
        borrowerPublic,
        pureCircuits.lenderKey(lenderSk),
        randomBytes(32),
        1000n,
      );

      const serializedLedger = JSON.stringify(ledger.read(), (k, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      );

      expect(serializedLedger).not.toContain('88888');
      expect(serializedLedger).not.toContain('2222');
    });
  });
});
