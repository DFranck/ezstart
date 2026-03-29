'use client'

import { Div, H6 } from '@ezstart/ui/components'
import { CopyCodeButton } from '../../components/copy-code-button'

interface PlaygroundCodeViewViewProps {
  fakeTagCode: string
  fakeAliasCode: string
}

const PlaygroundCodeView = ({ fakeTagCode, fakeAliasCode }: PlaygroundCodeViewViewProps) => {
  return (
    <Div className="mb-3">
      <Div className="grid grid-cols-1 gap-2">
        <Div>
          <Div className="flex items-center justify-between mb-1">
            <H6>Usage</H6>
            <CopyCodeButton code={fakeTagCode} />
          </Div>
          <pre className="bg-muted text-muted-foreground rounded p-2 text-xs overflow-x-auto">
            <code>{fakeTagCode}</code>
          </pre>
        </Div>
        <Div>
          <Div className="flex items-center justify-between mb-1">
            <H6>Alias</H6>
            <CopyCodeButton code={fakeAliasCode} />
          </Div>
          <pre className="bg-muted text-muted-foreground rounded p-2 text-xs overflow-x-auto">
            <code>{fakeAliasCode}</code>
          </pre>
        </Div>
      </Div>
    </Div>
  )
}

export default PlaygroundCodeView
