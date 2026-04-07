'use client'

import { Transformations } from '@/types/bagua'
import { DIRECTIONS_WITH_CENTER } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Div } from '@ezstart/ui/components'
import BaguaGrid from '../steps/BaguaGrid'
import BaguaWheel from '../steps/BaguaWheel'
import BaguaOrientationsGrid from '../BaguaOrientationsGrid'

/** Light theme CSS variable overrides for PDF capture.
 * Ensures captured content always uses light/print-friendly colors,
 * regardless of the app's current theme (dark mode). */
const LIGHT_THEME_VARS: Record<string, string> = {
  '--background': '#ffffff',
  '--foreground': '#0a0a0a',
  '--card': '#ffffff',
  '--card-foreground': '#0a0a0a',
  '--popover': '#ffffff',
  '--popover-foreground': '#0a0a0a',
  '--primary': '#171717',
  '--primary-foreground': '#fafafa',
  '--secondary': '#f5f5f5',
  '--secondary-foreground': '#171717',
  '--muted': '#f5f5f5',
  '--muted-foreground': '#737373',
  '--accent': '#f5f5f5',
  '--accent-foreground': '#171717',
  '--destructive': '#ef4444',
  '--destructive-foreground': '#fafafa',
  '--success': '#22c55e',
  '--success-foreground': '#ffffff',
  '--warning': '#f59e0b',
  '--warning-foreground': '#ffffff',
  '--info': '#3b82f6',
  '--info-foreground': '#ffffff',
  '--border': 'transparent',
  '--input': '#e5e5e5',
  '--ring': 'transparent',
  '--shadow': 'none',
}

interface PdfCaptureContainersProps {
  wheelRef: React.RefObject<HTMLDivElement | null>
  gridRef: React.RefObject<HTMLDivElement | null>
  cardsGridRef: React.RefObject<HTMLDivElement | null>
  planImage?: string
  bearingFromNorth: number
  config: YearBaguaConfig
  transformations?: Transformations
  isPremium: boolean
}

export function PdfCaptureContainers({
  wheelRef,
  gridRef,
  cardsGridRef,
  planImage,
  bearingFromNorth,
  config,
  transformations,
  isPremium,
}: PdfCaptureContainersProps) {
  return (
    <>
      {/* CSS overrides for clean PDF capture — print-friendly rendering */}
      <style>{`
        [data-bagua] *, [data-bagua] *::before, [data-bagua] *::after {
          box-shadow: none !important;
          text-shadow: none !important;
          outline: none !important;
        }
        [data-bagua="orientations-container"] * {
          border-width: 0 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        /* Restore intentional colored borders (cycles grid) */
        [data-bagua="orientations-container"] [class*="border-success"],
        [data-bagua="orientations-container"] [class*="border-destructive"],
        [data-bagua="orientations-container"] [class*="border-warning"] {
          border-width: 1px !important;
        }
        /* Keep the colored top bar on each sector */
        [data-bagua="orientations-container"] .h-\\[5px\\] {
          height: 5px !important;
        }
        /* Remove text truncation for full content */
        [data-bagua="orientations-container"] .truncate {
          overflow: visible !important;
          text-overflow: unset !important;
          white-space: normal !important;
        }
        [data-bagua="orientations-container"] .line-clamp-1,
        [data-bagua="orientations-container"] .line-clamp-3 {
          -webkit-line-clamp: unset !important;
          display: block !important;
          overflow: visible !important;
        }
        /* Remove button styling for clean static render */
        [data-bagua="orientations-container"] button {
          all: unset !important;
          display: block !important;
          width: 100% !important;
          padding: 12px !important;
          cursor: default !important;
          color: inherit !important;
          text-align: left !important;
        }
      `}</style>
      {/* Wheel MASQUEE pour capture PDF */}
      <Div
        ref={wheelRef}
        style={
          {
            width: '600px',
            height: '600px',
            position: 'fixed',
            left: '-9999px',
            top: '0',
            pointerEvents: 'none',
            zIndex: -1,
            overflow: 'hidden',
            ...LIGHT_THEME_VARS,
          } as React.CSSProperties
        }
        data-bagua="wheel-container"
      >
        {config && (
          <BaguaWheel
            src={planImage}
            bearingFromNorth={bearingFromNorth}
            size={600}
            config={config}
            radiusPct={46}
            insetRatio={1.0}
            labelOffset={12}
            cardsMode={undefined}
            cardsRadiusPct={35}
            onSectorClick={() => {}}
          />
        )}
      </Div>

      {/* Grid MASQUEE pour capture PDF */}
      <Div
        ref={gridRef}
        style={
          {
            width: '600px',
            height: '600px',
            position: 'fixed',
            left: '-9999px',
            top: '0',
            pointerEvents: 'none',
            zIndex: -1,
            overflow: 'hidden',
            ...LIGHT_THEME_VARS,
          } as React.CSSProperties
        }
        data-bagua="grid-container"
      >
        {config && (
          <BaguaGrid
            src={planImage}
            bearingFromNorth={bearingFromNorth}
            size={600}
            config={config}
            cardsMode={undefined}
            transformations={transformations}
          />
        )}
      </Div>

      {/* Orientations content for PDF capture — all sectors expanded */}
      <Div
        ref={cardsGridRef}
        style={
          {
            width: '700px',
            backgroundColor: '#ffffff',
            color: '#000000',
            position: 'fixed',
            left: '-9999px',
            top: '0',
            pointerEvents: 'none',
            zIndex: -1,
            ...LIGHT_THEME_VARS,
          } as React.CSSProperties
        }
        data-bagua="orientations-container"
      >
        <BaguaOrientationsGrid
          config={config}
          expandedSectors={new Set(DIRECTIONS_WITH_CENTER)}
          isPremium={isPremium}
          isAuthenticated={true}
          hideControls={true}
        />
      </Div>
    </>
  )
}
