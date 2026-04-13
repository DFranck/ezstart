/**
 * Stable public interface for the Design System Inspector registry.
 *
 * The real content lives in `registry.generated.ts` (gitignored, rebuilt
 * by `turbo run generate`). This file is committed so consumers keep a
 * stable import path (`./registry`) regardless of regeneration.
 */
export * from './registry.generated'
