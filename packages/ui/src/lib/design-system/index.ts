/**
 * Design System - @ezstart/ui
 *
 * Système de design centralisé avec tokens responsive.
 * Architecture inspirée de tag/ mais optimisée et étendue.
 */

export * from './tokens'
export * from './variants'
export { DesignTokenProvider, useDesignTokens, type DesignTokens } from './DesignTokenContext'
export { designPresets, getPreset } from './presets'
