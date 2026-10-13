// Terminal-side model of the facility shown on the desk. Purely presentational;
// the contract run in chain.ts is the source of truth.

export type FacilityPhase = 'REQUESTED' | 'FUNDED' | 'REPAID' | 'LIQUIDATED';

export type Facility = {
  debt: bigint;
  units: bigint;
  px: bigint;
  floorBps: bigint;
  phase: FacilityPhase;
};

export type RunState = 'idle' | 'running' | 'completed' | 'rejected';

export const desk = {
  facility: { debt: 50_000n, units: 100n, px: 1_000n, floorBps: 15_000n, phase: 'FUNDED' } as Facility,
  run: 'idle' as RunState,
  lines: 0,
};
