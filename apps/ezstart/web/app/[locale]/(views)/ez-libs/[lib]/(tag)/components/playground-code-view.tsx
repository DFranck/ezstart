import { H6 } from '@ezstart/ui/components';

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
          <H6 className='mb-1'>Usage</H6>
          <pre className='bg-muted rounded p-2 text-xs overflow-x-auto'>
            <code>{fakeTagCode}</code>
          </pre>
        </div>
        <div>
          <H6 className='mb-1'>Alias</H6>
          <pre className='bg-muted rounded p-2 text-xs overflow-x-auto'>
            <code>{fakeAliasCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundCodeView;
