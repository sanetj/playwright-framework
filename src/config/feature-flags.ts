export const featureFlags = {
  visualTesting: process.env.FEATURE_VISUAL_TESTING !== 'false',
  accessibilityTesting: process.env.FEATURE_ACCESSIBILITY_TESTING !== 'false',
  checkout: process.env.FEATURE_CHECKOUT !== 'false'
} as const;

export function isFeatureEnabled(flag: keyof typeof featureFlags): boolean { return featureFlags[flag]; }
