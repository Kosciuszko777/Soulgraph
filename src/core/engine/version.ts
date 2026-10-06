/**
 * Engine version (Engine layer).
 *
 * Bump this whenever scoring logic changes in a way that would alter outputs
 * for the same responses. Stamped onto every scale value and into provenance so
 * any graph can be identified with the exact engine that produced it, and
 * deterministically re-scored later. See docs/ARCHITECTURE.md §1–§2.
 */
export const ENGINE_VERSION = '1.0.0' as const;
