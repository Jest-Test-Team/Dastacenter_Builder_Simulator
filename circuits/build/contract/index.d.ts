import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  graphDigest(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  competitionScore(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  blindingFactor(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  proveThreshold(context: __compactRuntime.CircuitContext<PS>,
                 claimedThreshold_0: bigint,
                 packVersion_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  proveThreshold(context: __compactRuntime.CircuitContext<PS>,
                 claimedThreshold_0: bigint,
                 packVersion_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  openCommitment(digest_0: Uint8Array,
                 blinding_0: Uint8Array,
                 packVersion_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  proveThreshold(context: __compactRuntime.CircuitContext<PS>,
                 claimedThreshold_0: bigint,
                 packVersion_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  openCommitment(context: __compactRuntime.CircuitContext<PS>,
                 digest_0: Uint8Array,
                 blinding_0: Uint8Array,
                 packVersion_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly rulePackVersion: Uint8Array;
  readonly threshold: bigint;
  readonly commitment: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
