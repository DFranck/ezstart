'use client'

import type { ComponentEntry } from '@ezstart/pay-sdk/components/registry'
import { Badge, Card, CardContent, Div, P, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface PropsTableProps {
  props: ComponentEntry['props']
}

/**
 * Renders the public props of a component as a clean table. Falls back to
 * a friendly empty state when the component has no public props.
 */
export function PropsTable({ props }: PropsTableProps) {
  const t = useTranslations('components')

  if (props.length === 0) {
    return (
      <Card variant="default">
        <CardContent className="py-10 text-center">
          <P className="text-sm text-muted-foreground">{t('propsEmpty')}</P>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="default" className="overflow-hidden">
      <CardContent className="p-0">
        <Div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                  {t('propsHeaderName')}
                </th>
                <th className="px-4 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                  {t('propsHeaderType')}
                </th>
                <th className="px-4 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                  {t('propsHeaderRequired')}
                </th>
                <th className="px-4 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                  {t('propsHeaderDescription')}
                </th>
              </tr>
            </thead>
            <tbody>
              {props.map((prop, idx) => (
                <tr key={prop.name} className={idx > 0 ? 'border-t' : undefined}>
                  <td className="px-4 py-3 align-top font-mono text-xs">
                    <Span className="font-semibold">{prop.name}</Span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono break-all">
                      {prop.type}
                    </code>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {prop.required ? (
                      <Badge variant="destructive" size="xs">
                        {t('propsRequired')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" size="xs">
                        {t('propsOptional')}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground max-w-md">
                    {prop.description || (
                      <Span className="italic text-muted-foreground/60">
                        {t('propsNoDescription')}
                      </Span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Div>
      </CardContent>
    </Card>
  )
}
