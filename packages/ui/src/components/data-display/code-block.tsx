/**
 * CodeBlock Component - Display a labeled code snippet
 *
 * Abstraction for code examples on landing pages and docs. Renders an optional
 * Badge label + a `<Pre><Code/></Pre>` block with bordered styling.
 *
 * @example
 * <CodeBlock label="Install" code="npm install @ezstart/ui" />
 *
 * @example
 * // Without label
 * <CodeBlock code="const x = 1" />
 */

import * as React from 'react'
import { cn } from '../../lib/utils'
import { Badge } from './badge'
import { Code, Div, Pre } from '../tag'

// ========== Types ==========

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Code content (string only — for syntax-highlighted, pass children instead) */
  code: string
  /** Optional label rendered as a Badge above the code */
  label?: string
  /** Language hint (placeholder for future syntax highlighting) */
  language?: string
}

// ========== Component ==========

export const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  ({ code, label, language: _language, className, ...props }, ref) => {
    return (
      <Div ref={ref} className={cn('text-left min-w-0', className)} {...props}>
        {label && (
          <Div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">{label}</Badge>
          </Div>
        )}
        <Pre className="border max-w-full">
          <Code className="text-foreground">{code}</Code>
        </Pre>
      </Div>
    )
  }
)

CodeBlock.displayName = 'CodeBlock'

export default CodeBlock
