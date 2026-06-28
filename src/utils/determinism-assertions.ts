/**
 * @architecture_authority Global Utilities
 * @responsibility Provides compile-time and runtime mathematical guarantees of operational determinism.
 * @allowed_dependencies None
 */

/**
 * Mathematically asserts the Zero Deletion Doctrine.
 * Specifically guarantees that array filtering or sorting operations do not silently drop elements.
 * 
 * @deterministic true
 * @throws Error if length diverges
 */
export function assertZeroDeletion<T>(arrayBefore: T[], arrayAfter: T[], contextLabel: string): void {
  if (arrayBefore.length !== arrayAfter.length) {
    throw new Error(`Zero Deletion Doctrine Violation: Count altered during ${contextLabel} (${arrayBefore.length} vs ${arrayAfter.length})`);
  }
}
