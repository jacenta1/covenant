// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { CovenantDomain } from '../../contract/src/domain/covenant.js';
import type { LoanTerms } from '../../contract/src/managed/covenant/contract/index.js';

describe('Covenant Domain Logic', () => {
  it('correctly assesses covenant boundary ratios', () => {
    // 150.00% min ratio
    expect(CovenantDomain.meetsCovenantRatio(150n, 100n, 10_000n, 15_000n)).toBe(true);
    expect(CovenantDomain.meetsCovenantRatio(149n, 100n, 10_000n, 15_000n)).toBe(false);
    expect(CovenantDomain.meetsCovenantRatio(300n, 100n, 10_000n, 15_000n)).toBe(true);
  });

  it('detects liquidation triggers accurately across price movements', () => {
    const terms: LoanTerms = {
      borrowAmount: 10_000n,
      collateralAmount: 200n,
      minRatioBps: 15_000n,
      dueTimestamp: 50_000n,
      currency: 1n,
    };

    // At price 100, collateral value = 20,000 (200%), safe
    expect(CovenantDomain.isLiquidatable(terms, 100n)).toBe(false);

    // At price 75, collateral value = 15,000 (150%), safe
    expect(CovenantDomain.isLiquidatable(terms, 75n)).toBe(false);

    // At price 74, collateral value = 14,800 (148%), breached!
    expect(CovenantDomain.isLiquidatable(terms, 74n)).toBe(true);
  });
});
