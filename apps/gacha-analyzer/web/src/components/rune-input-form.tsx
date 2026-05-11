'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  Input,
  Label,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
  Switch,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { RUNE_SET_INFO, MAIN_STAT_MAX, getExpectedSubstatCount } from '@gacha-analyzer/types'
import type { RuneSet, RuneQuality, StatType, RuneSlot } from '@gacha-analyzer/types'
import type { CalculateRuneInput, RuneStatInput } from '@/hooks/use-calculate-rune'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RUNE_SETS = Object.keys(RUNE_SET_INFO) as RuneSet[]
const RUNE_QUALITIES: RuneQuality[] = ['normal', 'magic', 'rare', 'hero', 'legend']
const RUNE_LEVELS = [0, 3, 6, 9, 12, 15] as const
const ALL_STAT_TYPES: StatType[] = [
  'hp',
  'hp%',
  'atk',
  'atk%',
  'def',
  'def%',
  'spd',
  'cr',
  'cd',
  'res',
  'acc',
]

const SLOT_MAIN_STATS: Record<RuneSlot, StatType[]> = {
  1: ['atk'],
  2: ['spd', 'atk%', 'def%', 'hp%'],
  3: ['def'],
  4: ['cr', 'cd', 'atk%', 'def%', 'hp%'],
  5: ['hp'],
  6: ['acc', 'res', 'atk%', 'def%', 'hp%'],
}

const QUALITY_BADGE_COLORS: Record<RuneQuality, string> = {
  normal: 'bg-muted text-muted-foreground border-border',
  magic: 'bg-success/15 text-success border-success/40',
  rare: 'bg-primary/15 text-primary border-primary/40',
  hero: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
  legend: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatRowProps {
  index: number
  stat: RuneStatInput | undefined
  onChange: (stat: RuneStatInput | undefined) => void
  label: string
  optional?: boolean
}

function StatRow({ index, stat, onChange, label, optional }: StatRowProps) {
  const t = useTranslations('calculate')
  return (
    <Div className="flex items-center gap-2">
      <Label className="w-24 shrink-0 text-xs text-muted-foreground">{label}</Label>
      <Select
        value={stat?.type ?? ''}
        onValueChange={val => {
          if (!val && optional) {
            onChange(undefined)
            return
          }
          onChange({ type: val as StatType, value: stat?.value ?? 0 })
        }}
      >
        <SelectTrigger className="h-8 flex-1 text-xs">
          <SelectValue placeholder={t('form.statType')} />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value="">{t('form.none')}</SelectItem>}
          {ALL_STAT_TYPES.map(s => (
            <SelectItem key={`stat-${index}-${s}`} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        className="h-8 w-20 text-xs"
        type="number"
        min={0}
        max={9999}
        value={stat?.value ?? ''}
        disabled={!stat?.type}
        placeholder="0"
        onChange={e => {
          if (!stat?.type) return
          onChange({ type: stat.type, value: Number(e.target.value) })
        }}
      />
    </Div>
  )
}

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------

function makeDefaultForm(): CalculateRuneInput {
  return {
    slot: 2,
    set: 'swift',
    quality: 'legend',
    level: 12,
    isAncient: false,
    mainStat: { type: 'spd', value: 42 },
    substats: [],
    innateStat: undefined,
    profile: 'mid',
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RuneInputFormProps {
  onSubmit: (data: CalculateRuneInput) => void
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RuneInputForm({ onSubmit, isLoading = false }: RuneInputFormProps) {
  const t = useTranslations('calculate')
  const [form, setForm] = useState<CalculateRuneInput>(makeDefaultForm)

  const expectedSubCount = getExpectedSubstatCount(form.quality ?? 'legend', form.level)
  const substatSlots = Array.from({ length: Math.min(expectedSubCount, 4) }, (_, i) => i)

  // When slot changes, reset mainStat to first valid option
  function handleSlotChange(slot: RuneSlot) {
    const options = SLOT_MAIN_STATS[slot]
    const firstStat = options[0]
    const maxVal = MAIN_STAT_MAX[String(slot)]?.[firstStat!] ?? 0
    setForm(f => ({
      ...f,
      slot,
      mainStat: { type: firstStat!, value: maxVal },
    }))
  }

  function handleSubstatChange(index: number, stat: RuneStatInput | undefined) {
    setForm(f => {
      const next = [...f.substats]
      if (stat === undefined) {
        next.splice(index, 1)
      } else {
        next[index] = stat
      }
      return { ...f, substats: next }
    })
  }

  function handleSubmit() {
    onSubmit(form)
  }

  function handleReset() {
    setForm(makeDefaultForm())
  }

  const mainStatOptions = SLOT_MAIN_STATS[form.slot]

  return (
    <Card>
      <CardHeader>
        <H3 className="text-base font-semibold">{t('form.title')}</H3>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Slot selector */}
        <Div className="space-y-2">
          <Label className="text-sm font-medium">{t('form.slot')}</Label>
          <Div className="flex gap-2">
            {([1, 2, 3, 4, 5, 6] as RuneSlot[]).map(s => (
              <Button
                key={s}
                variant={form.slot === s ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                onClick={() => handleSlotChange(s)}
              >
                {s}
              </Button>
            ))}
          </Div>
          <P className="text-xs text-muted-foreground">
            {t('form.slotMainHint', { stats: mainStatOptions.join(', ') })}
          </P>
        </Div>

        {/* Set selector */}
        <Div className="space-y-2">
          <Label className="text-sm font-medium">{t('form.set')}</Label>
          <Select value={form.set} onValueChange={v => setForm(f => ({ ...f, set: v as RuneSet }))}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RUNE_SETS.map(s => (
                <SelectItem key={s} value={s}>
                  {s} ({RUNE_SET_INFO[s].pieces}pc — {RUNE_SET_INFO[s].bonus})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Div>

        {/* Quality */}
        <Div className="space-y-2">
          <Label className="text-sm font-medium">{t('form.quality')}</Label>
          <Div className="flex flex-wrap gap-2">
            {RUNE_QUALITIES.map(q => (
              <Badge
                key={q}
                variant="outline"
                className={`cursor-pointer select-none border px-3 py-1 text-xs transition-opacity ${QUALITY_BADGE_COLORS[q]} ${form.quality === q ? 'opacity-100 ring-2 ring-ring ring-offset-1' : 'opacity-60 hover:opacity-80'}`}
                onClick={() => setForm(f => ({ ...f, quality: q }))}
              >
                {t(`form.quality_${q}`)}
              </Badge>
            ))}
          </Div>
        </Div>

        {/* Level */}
        <Div className="space-y-2">
          <Label className="text-sm font-medium">{t('form.level')}</Label>
          <Div className="flex flex-wrap gap-2">
            {RUNE_LEVELS.map(lv => (
              <Button
                key={lv}
                variant={form.level === lv ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setForm(f => ({ ...f, level: lv }))}
              >
                +{lv}
              </Button>
            ))}
          </Div>
        </Div>

        {/* Ancient toggle */}
        <Div className="flex items-center gap-3">
          <Switch
            checked={form.isAncient ?? false}
            onCheckedChange={v => setForm(f => ({ ...f, isAncient: v }))}
          />
          <Label className="text-sm font-medium">{t('form.ancient')}</Label>
        </Div>

        {/* Main stat */}
        <Div className="space-y-2">
          <Label className="text-sm font-medium">{t('form.mainStat')}</Label>
          <Div className="flex items-center gap-2">
            <Select
              value={form.mainStat.type}
              onValueChange={v => {
                const type = v as StatType
                const maxVal = MAIN_STAT_MAX[String(form.slot)]?.[type] ?? 0
                setForm(f => ({ ...f, mainStat: { type, value: maxVal } }))
              }}
            >
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mainStatOptions.map(s => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-8 w-24 text-xs"
              type="number"
              min={0}
              max={9999}
              value={form.mainStat.value}
              onChange={e =>
                setForm(f => ({ ...f, mainStat: { ...f.mainStat, value: Number(e.target.value) } }))
              }
            />
          </Div>
        </Div>

        {/* Substats */}
        <Div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('form.substats')}
            <Span className="ml-2 text-xs text-muted-foreground">
              {t('form.substatsHint', { expected: substatSlots.length })}
            </Span>
          </Label>
          <Div className="space-y-2">
            {substatSlots.map(i => (
              <StatRow
                key={i}
                index={i}
                label={t('form.substatN', { n: i + 1 })}
                stat={form.substats[i]}
                onChange={stat => handleSubstatChange(i, stat)}
              />
            ))}
          </Div>
        </Div>

        {/* Innate stat */}
        <Div className="space-y-2">
          <Label className="text-sm font-medium">{t('form.innate')}</Label>
          <StatRow
            index={-1}
            label={t('form.optional')}
            stat={form.innateStat}
            optional
            onChange={stat => setForm(f => ({ ...f, innateStat: stat }))}
          />
        </Div>

        {/* Profile selector */}
        <Div className="space-y-2">
          <Label className="text-sm font-medium">{t('form.profile')}</Label>
          <Div className="flex gap-2">
            {(['early', 'mid', 'late'] as const).map(p => (
              <Button
                key={p}
                variant={form.profile === p ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setForm(f => ({ ...f, profile: p }))}
              >
                {t(`form.profile_${p}`)}
              </Button>
            ))}
          </Div>
        </Div>

        {/* Actions */}
        <Div className="flex gap-3 pt-2">
          <Button variant="default" className="flex-1" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t('form.analyzing') : t('form.analyze')}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            {t('form.reset')}
          </Button>
        </Div>
      </CardContent>
    </Card>
  )
}
