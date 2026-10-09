// SPDX-License-Identifier: Apache-2.0

import type { LoanTerms } from '../managed/covenant/contract/index.js';

export class CovenantDomain {
  static meetsCovenantRatio(
    collateral: bigint,
    price: bigint,
    borrow: bigint,
    minRatioBps: bigint,
  ): boolean {
    const collateralValue = collateral * price * 10000n;
    const requiredValue = borrow * minRatioBps;
    return collateralValue >= requiredValue;
  }

  static calculateCurrentRatioBps(collateral: bigint, price: bigint, borrow: bigint): bigint {
    if (borrow === 0n) return 0n;
    return (collateral * price * 10000n) / borrow;
  }

  static isLiquidatable(
    terms: LoanTerms,
    currentPrice: bigint,
  ): boolean {
    return !this.meetsCovenantRatio(
      terms.collateralAmount,
      currentPrice,
      terms.borrowAmount,
      terms.minRatioBps,
    );
  }
}
