/* path: /components/BaguaSectorCard.tsx */
'use client'

/* path: /components/BaguaSectorCard.tsx */
import type { Direction } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import {
  Badge,
  Div,
  H3,
  H4,
  Icon,
  type KnownIconName,
  LI,
  P,
  Section,
  Span,
  UL,
} from '@ezstart/ui/components'
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

  // Couleur d'accent (priorité à colorHex de la config, sinon par élément)
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
    <Div
      role="dialog"
      aria-label={`${s.title} – ${s.element}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        'absolute -translate-x-1/2 -translate-y-1/2',
        'rounded-2xl border bg-card/95 backdrop-blur',
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
      {/* Ribbon / barre d'accent */}
      <Div
        aria-hidden
        className="h-1.5 w-full rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}CC)` }}
      />

      {/* Header */}
      <Div className="px-3.5 pt-3.5 pb-2 flex items-center gap-2.5">
        {s.icon && (
          <Span
            className="grid h-7 w-7 place-items-center rounded-xl"
            style={{ backgroundColor: `${accent}14` }}
            aria-hidden
          >
            <Icon name={s.icon as KnownIconName} className="h-4 w-4" style={{ color: accent }} />
          </Span>
        )}

        <Div className="min-w-0">
          <Div className="flex items-center gap-2">
            <H3 className="text-sm font-bold text-foreground truncate">{s.title}</H3>
            <Badge
              variant="outline"
              size="xs"
              className="rounded-md"
              style={{
                color: accent,
                backgroundColor: `${accent}14`,
                borderColor: `${accent}2A`,
              }}
            >
              {s.element}
            </Badge>
          </Div>
          {s.summary && <P className="mt-1 text-xs text-muted-foreground">{s.summary}</P>}
        </Div>
      </Div>

      {/* Body */}
      <Div className="px-3.5 pb-3.5">
        {/* Mots-clés */}
        {has.keywords && (
          <Div className="mt-2 flex flex-wrap gap-1.5">
            {s.keywords!.map(k => (
              <Badge
                key={k}
                variant="outline"
                size="xs"
                className="text-muted-foreground"
                style={{ borderColor: `${accent}26`, backgroundColor: `${accent}0D` }}
              >
                {k}
              </Badge>
            ))}
          </Div>
        )}

        {/* Listes (tips / enhancers / remedies / avoid / symbols) */}
        <Div className="mt-2 space-y-2">
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
        </Div>

        {/* Notes */}
        {has.notes && (
          <Div
            className="mt-2 rounded-lg border p-2.5 text-[11px] leading-5 text-muted-foreground"
            style={{ borderColor: `${accent}26`, backgroundColor: `${accent}0D` }}
          >
            {s.notes}
          </Div>
        )}
      </Div>
    </Div>
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
    <Section aria-label={title}>
      <H4 className="mb-1 text-[11px] font-semibold text-foreground">{title}</H4>
      <UL className="space-y-1.5">
        {items.map(it => (
          <LI key={it} className="flex items-start gap-1.5 text-[12px] text-foreground">
            <Icon
              name={bullet as KnownIconName}
              className="mt-[2px] h-3.5 w-3.5 shrink-0"
              style={{ color: danger ? '#dc2626' : color }}
              aria-hidden
            />
            <Span className="leading-5">{it}</Span>
          </LI>
        ))}
      </UL>
    </Section>
  )
}

function ListFlat(props: { title: string; items: string[]; icon: string; color: string }) {
  const { title, items, icon, color } = props
  return (
    <Section aria-label={title}>
      <H4 className="mb-1 text-[11px] font-semibold text-foreground">{title}</H4>
      <Div className="flex flex-wrap gap-1.5">
        {items.map(it => (
          <Badge
            key={it}
            variant="outline"
            size="xs"
            className="gap-1 rounded-md text-foreground"
            style={{ borderColor: `${color}26`, backgroundColor: 'hsl(var(--background))' }}
          >
            <Icon name={icon as KnownIconName} className="h-3 w-3" style={{ color }} aria-hidden />
            {it}
          </Badge>
        ))}
      </Div>
    </Section>
  )
}
