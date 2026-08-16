'use client'

import { useState } from 'react'
import { Div, Main } from '@ezstart/ui/components'
import { RuneInputForm } from '@/components/rune-input-form'
import { CalculateOutput } from '@/components/calculate-output'
import { useCalculateRune } from '@/hooks/use-calculate-rune'
import type { CalculateRuneInput, CalculateRuneResult } from '@/hooks/use-calculate-rune'
import { parseApiError } from '@/config/api'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export default function CalculatePage() {
  const t = useTranslations('calculate')
  const [result, setResult] = useState<CalculateRuneResult | null>(null)
  const { mutate, isPending } = useCalculateRune()

  function handleSubmit(runeData: CalculateRuneInput) {
    mutate(runeData, {
      onSuccess: data => {
        setResult(data)
        toast.success(t('output.success'))
      },
      onError: err => {
        const parsed = parseApiError(err)
        toast.error(parsed ?? t('output.error'))
      },
    })
  }

  return (
    <Main className="container mx-auto max-w-6xl px-4 py-6">
      <Div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column: input form */}
        <Div>
          <RuneInputForm onSubmit={handleSubmit} isLoading={isPending} />
        </Div>

        {/* Right column: analysis output */}
        <Div>
          <CalculateOutput result={result} />
        </Div>
      </Div>
    </Main>
  )
}
