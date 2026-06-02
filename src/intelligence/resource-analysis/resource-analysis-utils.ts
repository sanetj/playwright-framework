/**
 * @canonical
 * Phase 10.5A Bounded Utility Isolation
 * Central sanitization logic for generating deterministic, human-readable IDs.
 */

export function sanitizeResourceFamily(family: string): string {
  return family
    .replace(/^\//, '')
    .replace(/\/:/g, '_')
    .replace(/\//g, '_')
    .replace(/:/g, '_');
}
