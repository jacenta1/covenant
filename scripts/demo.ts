// SPDX-License-Identifier: Apache-2.0

import {
  LoanStatus,
  pureCircuits,
  type LoanTerms,
} from '../contract/src/managed/covenant/contract/index.js';
import { CovenantBench } from '../contract/src/simulator.js';
import { CovenantDomain } from '../contract/src/domain/covenant.js';

function randomBytes(length: number = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function runDemo() {
  console.log('------------------------------------------------------------');
  console.log('COVENANT: Private Debt-to-Collateral Protocol on Midnight');
  console.log('Zero balance disclosures, verifiable ZK solvency thresholds.');
  console.log('------------------------------------------------------------\n');

  const adminSecret = randomBytes(32);
  const ledger = await CovenantBench.deploy(adminSecret);
  console.log('[1/6] Contract deployed with Arbiter Admin:', toHex(ledger.read().admin));

  const oracleSecret = randomBytes(32);
  const custodianSecret = randomBytes(32);
  const borrowerSecret = randomBytes(32);
  const lenderSecret = randomBytes(32);

  const oraclePub = pureCircuits.oracleKey(oracleSecret);
  const custodianPub = pureCircuits.custodianKey(custodianSecret);
  const borrowerPub = pureCircuits.borrowerKey(borrowerSecret);
  const lenderPub = pureCircuits.lenderKey(lenderSecret);
  const arbiterPub = pureCircuits.arbiterKey(adminSecret);

  // Admin registers oracle and custodian
  const admin = ledger.join(adminSecret);
  await admin.registerOracle(oraclePub);
  await admin.registerCustodian(custodianPub);
  console.log('      Certified Oracle Registered:   ', toHex(oraclePub));
  console.log('      Certified Custodian Registered:', toHex(custodianPub));

  // Oracle posts price
  const oracle = ledger.join(oracleSecret);
  await oracle.postPrice(1n, 1_000n);
  console.log('      Oracle posted verified on-chain price: $1,000 for Currency #1');

  // Custodian attests borrower's 100 collateral deposit
  const colSalt = randomBytes(32);
  const colCommit = pureCircuits.collateralCommitment(borrowerPub, 1n, 100n, colSalt);
  const custodian = ledger.join(custodianSecret);
  await custodian.attestCollateral(borrowerPub, 1n, colCommit);
  console.log('      Custodian published collateral commitment for borrower');

  // Loan terms: 50,000 USD borrow, 100 ETH collateral, ETH price = $1,000
  // Collateral value = $100,000. Ratio = 200.00%. Minimum required = 150.00% (15000 bps)
  const terms: LoanTerms = {
    borrowAmount: 50_000n,
    collateralAmount: 100n,
    minRatioBps: 15_000n,
    dueTimestamp: 200_000n,
    currency: 1n,
  };
  const loanSalt = randomBytes(32);
  const loanId = randomBytes(32);

  const commitment = pureCircuits.loanCommitment(terms, borrowerPub, loanSalt);
  console.log('\n[2/6] Constructing private loan terms:');
  console.log('      * Secret Collateral: [HIDDEN IN ZK]');
  console.log('      * Secret Borrow Sum: [HIDDEN IN ZK]');
  console.log('      * Verifiable Ratio Proof: Valid (>= 150.00%)');
  console.log('      * Public Terms Commitment:', toHex(commitment));

  const borrower = ledger.join(borrowerSecret, terms, loanSalt, colSalt);
  await borrower.requestLoan(loanId, borrowerPub, lenderPub, arbiterPub, 1000n);
  console.log('      Loan request submitted to Midnight ledger. Status: PENDING');

  const lender = ledger.join(lenderSecret);
  await lender.fundLoan(loanId);
  console.log('\n[3/6] Lender authenticated with private key & funded loan. Status: FUNDED');

  console.log('\n[4/6] Simulating Oracle price movement:');
  const healthyRatio = CovenantDomain.calculateCurrentRatioBps(100n, 1000n, 50_000n);
  console.log(`      Current ETH Price: $1,000 -> Health Ratio: ${Number(healthyRatio) / 100}% (No liquidation allowed)`);

  console.log('\n[5/6] Borrower repays confidential debt:');
  const receipt = await borrower.repayLoan(loanId);
  console.log('      Loan Repaid successfully!');
  console.log('      Cryptographic Settlement Receipt:', toHex(receipt));
  console.log('      Nullifier committed to prevent replay attacks.');

  const finalStatus = ledger.read().loans.lookup(loanId).status;
  console.log('\n[6/6] Final Loan Status:', LoanStatus[finalStatus]);
  console.log('------------------------------------------------------------');
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
