'use client';

import { H6 } from '@ezstart/ui/components';
import { CopyCodeButton } from '../../components/copy-code-button';

interface PlaygroundCodeViewViewProps {
  fakeTagCode: string;
  fakeAliasCode: string;
}

const PlaygroundCodeView = ({
  fakeTagCode,
  fakeAliasCode,
}: PlaygroundCodeViewViewProps) => {
  return (
    <div className='mb-3'>
      <div className='grid grid-cols-1 gap-2'>
        <div>
          <div className='flex items-center justify-between mb-1'>
            <H6>Usage</H6>
            <CopyCodeButton code={fakeTagCode} />
          </div>
          <pre className='bg-muted text-muted-foreground rounded p-2 text-xs overflow-x-auto'>
            <code>{fakeTagCode}</code>
          </pre>
        </div>
        <div>
          <div className='flex items-center justify-between mb-1'>
            <H6>Alias</H6>
            <CopyCodeButton code={fakeAliasCode} />
          </div>
          <pre className='bg-muted text-muted-foreground rounded p-2 text-xs overflow-x-auto'>
            <code>{fakeAliasCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundCodeView;
