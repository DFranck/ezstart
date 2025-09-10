/* path: /components/BaguaSectorCard.tsx */
'use client'

/* path: /components/BaguaSectorCard.tsx */
import type { Direction } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Icon } from '@ezstart/ui/components'
import { useMemo } from 'react'

type Props = {
  dir: Direction
  cfg: YearBaguaConfig
  /** Position en pourcents du viewBox (0..100) */
  xPct: number
  yPct: number
  /** Décalage px depuis le point (pour éviter de chevaucher le label) */
  offset?: { x?: number; y?: number }
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function BaguaSectorCard({
  dir,
  cfg,
  xPct,
  yPct,
  offset,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const s = cfg.orientations[dir]
  if (!s) return null

  // Couleur d’accent (priorité à colorHex de la config, sinon par élément)
  const accent = useMemo(() => {
    if (s.colorHex) return s.colorHex
    switch (s.element) {
      case 'Eau':
        return '#0D47A1'
      case 'Bois':
        return '#2E7D32'
      case 'Feu':
        return '#D32F2F'
      case 'Terre':
        return '#BCA16A'
      case 'Métal':
        return '#B0BEC5'
      default:
        return '#94a3b8' // slate-400
    }
  }, [s.colorHex, s.element])

  const has = {
    keywords: !!s.keywords?.length,
    tips: !!s.tips?.length,
    enhancers: !!s.enhancers?.length,
    remedies: !!s.remedies?.length,
    avoid: !!s.avoid?.length,
    symbols: !!s.symbols?.length,
    notes: !!s.notes,
  }

  return (
    <div
      role="dialog"
      aria-label={`${s.title} – ${s.element}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        'absolute -translate-x-1/2 -translate-y-1/2',
        'rounded-2xl border bg-white/95 backdrop-blur',
        'shadow-[0_10px_30px_rgba(0,0,0,0.08)]',
        ' max-w-[82vw]',
        'transition-transform will-change-transform',
        'hover:scale-[1.015]',
      ].join(' ')}
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        marginLeft: offset?.x ?? 0,
        marginTop: offset?.y ?? 0,
        borderColor: `${accent}1A`, // ~10% opacity
      }}
    >
      {/* Ribbon / barre d’accent */}
      <div
        aria-hidden
        className="h-1.5 w-full rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}CC)` }}
      />

      {/* Header */}
      <div className="px-3.5 pt-3.5 pb-2 flex items-center gap-2.5">
        {s.icon && (
          <span
            className="grid h-7 w-7 place-items-center rounded-xl"
            style={{ backgroundColor: `${accent}14` }}
            aria-hidden
          >
            <Icon name={s.icon as any} className="h-4 w-4" style={{ color: accent }} />
          </span>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 truncate">{s.title}</h3>
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                color: accent,
                backgroundColor: `${accent}14`,
                border: `1px solid ${accent}2A`,
              }}
            >
              {s.element}
            </span>
          </div>
          {s.summary && <p className="mt-1 text-xs text-gray-600">{s.summary}</p>}
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 pb-3.5">
        {/* Mots-clés */}
        {has.keywords && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.keywords!.map(k => (
              <span
                key={k}
                className="rounded-full border px-2 py-0.5 text-[10px] text-gray-700"
                style={{ borderColor: `${accent}26`, backgroundColor: `${accent}0D` }}
              >
                {k}
              </span>
            ))}
          </div>
        )}

        {/* Listes (tips / enhancers / remedies / avoid / symbols) */}
        <div className="mt-2 space-y-2">
          {has.tips && (
            <ListBlock title="Conseils" items={s.tips!} bullet="lucide:check" color={accent} />
          )}
          {has.enhancers && (
            <ListBlock
              title="Activateurs"
              items={s.enhancers!}
              bullet="lucide:sparkles"
              color={accent}
            />
          )}
          {has.remedies && (
            <ListBlock title="Remèdes" items={s.remedies!} bullet="lucide:hammer" color={accent} />
          )}
          {has.avoid && (
            <ListBlock
              title="À éviter"
              items={s.avoid!}
              bullet="lucide:x-circle"
              color={accent}
              danger
            />
          )}
          {has.symbols && (
            <ListFlat title="Symboles" items={s.symbols!} icon="lucide:star" color={accent} />
          )}
        </div>

        {/* Notes */}
        {has.notes && (
          <div
            className="mt-2 rounded-lg border p-2.5 text-[11px] leading-5 text-gray-700"
            style={{ borderColor: `${accent}26`, backgroundColor: `${accent}0D` }}
          >
            {s.notes}
          </div>
        )}
      </div>
    </div>
  )
}

/* ———————————————————————————————————————————————————————————————— */
/* Petits sous-composants pour des sections propres                */
/* ———————————————————————————————————————————————————————————————— */

function ListBlock(props: {
  title: string
  items: string[]
  bullet: string
  color: string
  danger?: boolean
}) {
  const { title, items, bullet, color, danger } = props
  return (
    <section aria-label={title}>
      <h4 className="mb-1 text-[11px] font-semibold text-gray-900">{title}</h4>
      <ul className="space-y-1.5">
        {items.map(it => (
          <li key={it} className="flex items-start gap-1.5 text-[12px] text-gray-800">
            <Icon
              name={bullet as any}
              className="mt-[2px] h-3.5 w-3.5 shrink-0"
              style={{ color: danger ? '#dc2626' : color }}
              aria-hidden
            />
            <span className="leading-5">{it}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ListFlat(props: { title: string; items: string[]; icon: string; color: string }) {
  const { title, items, icon, color } = props
  return (
    <section aria-label={title}>
      <h4 className="mb-1 text-[11px] font-semibold text-gray-900">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map(it => (
          <span
            key={it}
            className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-gray-800"
            style={{ borderColor: `${color}26`, backgroundColor: 'white' }}
          >
            <Icon name={icon as any} className="h-3 w-3" style={{ color }} aria-hidden />
            {it}
          </span>
        ))}
      </div>
    </section>
  )
}
