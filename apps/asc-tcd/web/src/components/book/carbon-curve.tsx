import { Div } from '@ezstart/ui/components'

/** Years plotted on the x axis, with their label. */
const AGES = [0, 10, 20, 30, 40, 50, 60] as const

const CURVE =
  'M60 240 C 140 238, 200 200, 250 110 S 290 40, 310 40 S 400 85, 440 115 S 520 175, 560 190'

/**
 * Illustrative curve of the yearly CO₂ an urban tree absorbs as it ages
 * (slow first decade, peak around 30 years, decline until the ~60-year
 * average urban lifespan). Pure SVG so the figure stays crawlable and themed.
 */
export function CarbonCurve() {
  return (
    <Div className="my-6 rounded-lg border border-border bg-card p-4">
      <svg
        viewBox="0 0 620 300"
        role="img"
        aria-label="Courbe de la quantité de CO₂ absorbée par an par un arbre urbain selon son âge : très faible les dix premières années, pic autour de 30 ans, puis déclin jusqu'à 60 ans, durée de vie moyenne d'un arbre en ville."
        className="h-auto w-full"
      >
        <line x1="60" y1="240" x2="570" y2="240" className="stroke-border" strokeWidth="1.5" />
        <line x1="60" y1="30" x2="60" y2="240" className="stroke-border" strokeWidth="1.5" />
        <path d={`${CURVE} L560 240 L60 240 Z`} className="fill-primary/15" />
        <path d={CURVE} className="fill-none stroke-primary" strokeWidth="3" />
        <line
          x1="310"
          y1="40"
          x2="310"
          y2="240"
          className="stroke-primary"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {AGES.map(age => (
          <text
            key={age}
            x={60 + (age * 500) / 60}
            y="262"
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {age}
          </text>
        ))}
        <text x="565" y="282" textAnchor="end" className="fill-muted-foreground text-[11px]">
          Âge de l&apos;arbre (ans)
        </text>
        <text x="66" y="24" className="fill-muted-foreground text-[11px]">
          CO₂ absorbé par an
        </text>
        <text x="320" y="36" className="fill-foreground text-[12px] font-semibold">
          Pic d&apos;absorption
        </text>
        <text x="68" y="180" className="fill-muted-foreground text-[11px]">
          <tspan>Jeune pousse :</tspan>
          <tspan x="68" dy="14">
            captation modeste
          </tspan>
        </text>
        <text x="565" y="208" textAnchor="end" className="fill-foreground text-[11px]">
          Fin de vie moyenne en ville
        </text>
      </svg>
    </Div>
  )
}
