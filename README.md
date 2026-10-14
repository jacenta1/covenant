# Covenant

Private credit on Midnight. A borrower proves their loan stays above a collateral ratio without anyone seeing the collateral, the loan size, or the ratio itself.

## The problem

On-chain lending today is either fully transparent (every position is public and front-runnable) or fully off-chain (you trust the lender's spreadsheet). Under-collateralized credit needs a third option: the lender must be able to enforce the covenant, but the borrower's balance sheet should stay private.

## How it works

1. The admin registers a **price oracle** and a **collateral custodian**. Only registered keys can post prices or attest collateral.
2. The custodian commits a hash of the borrower's collateral position (`attestCollateral`). The amount never touches the ledger.
3. The borrower calls `requestLoan`. Inside the circuit, the private collateral is checked against the custodian's commitment and the oracle price, and `meetsCovenantRatio` must hold. Only the loan commitment is disclosed.
4. The lender funds; the borrower repays and receives a settlement receipt. A nullifier prevents the same loan being settled twice.
5. If the oracle price falls far enough that the ratio breaks, anyone can call `triggerLiquidation`. The circuit evaluates against the oracle's posted price, never a caller-supplied one.

## Circuits

| Circuit | Who | What it enforces |
| --- | --- | --- |
| `registerOracle`, `registerCustodian` | admin | Allow-lists the only keys that can feed data in |
| `postPrice` | oracle | Price per currency, stored on ledger |
| `attestCollateral` | custodian | Commitment to a borrower's collateral |
| `requestLoan` | borrower | Ratio check against attested collateral and oracle price |
| `fundLoan` / `repayLoan` | lender / borrower | State transitions with nullifier |
| `triggerLiquidation` | anyone | Liquidates only if the on-chain price breaks the covenant |

## Running it

```bash
npm install
npm test          # contract simulator + domain tests
npm run demo      # full lifecycle in the terminal
npm run dev       # web UI; "Run on compiled contract" executes the real circuits in the browser
```

The contract source is `contract/src/covenant.compact` (Compact 0.35.0). The compiled output is committed under `contract/src/managed/covenant`, and CI recompiles it from source and diffs the result.

## License

Apache 2.0
