/**
 * FAQ Component - Frequently Asked Questions
 *
 * Displays FAQ items from SEO config in accordion format.
 * Designed to work with Schema.org FAQ structured data.
 */

import * as React from 'react'
import { cn } from '../../lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../accordion'

// ========== Types ==========

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQProps extends React.HTMLAttributes<HTMLDivElement> {
  /** FAQ items from SEO config */
  items: FAQItem[]
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Default expanded item index */
  defaultExpanded?: number
  /** Allow multiple items open */
  allowMultiple?: boolean
}

// ========== FAQ Component ==========

export const FAQ = React.forwardRef<HTMLDivElement, FAQProps>(
  (
    {
      items,
      title = 'Frequently Asked Questions',
      description,
      defaultExpanded,
      allowMultiple = false,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{title}</h2>
          {description && (
            <p className="text-lg text-muted-foreground">{description}</p>
          )}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto">
          {allowMultiple ? (
            <Accordion
              type="multiple"
              defaultValue={
                defaultExpanded !== undefined ? [`item-${defaultExpanded}`] : undefined
              }
              className="space-y-4"
            >
              {items.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border rounded-lg px-6 bg-card"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-6">
                    <span className="text-base sm:text-lg font-semibold pr-4">
                      {item.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Accordion
              type="single"
              collapsible
              defaultValue={
                defaultExpanded !== undefined ? `item-${defaultExpanded}` : undefined
              }
              className="space-y-4"
            >
              {items.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border rounded-lg px-6 bg-card"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-6">
                    <span className="text-base sm:text-lg font-semibold pr-4">
                      {item.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    )
  }
)

FAQ.displayName = 'FAQ'

export default FAQ
