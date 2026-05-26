/**
 * WorkflowNormalizationContract
 * Design-time assertions outlining constraints and expected behaviors for workflow normalization.
 */
export interface WorkflowNormalizationContract {
  readonly fingerprintRequiresNormalizedMetadata: true;
  readonly normalizationRules: readonly string[];
}

export const WORKFLOW_NORMALIZATION_CONTRACT: WorkflowNormalizationContract = {
  fingerprintRequiresNormalizedMetadata: true,
  normalizationRules: [
    'copy-arrays',
    'remove-duplicates',
    'lexicographic-sort',
    'stable-order-preservation'
  ] as const
};
