import { LI, UL } from '@ezstart/ui/components';

const Log = ({ log }: { log: string[] }) => {
  return (
    <div>
      <h4 className='font-bold mb-2'>Logs</h4>
      <UL className='text-xs text-gray-500  overflow-auto bg-gray-900 rounded p-2'>
        {log.map((l, i) => (
          <LI key={i} size={'sm'}>
            {l}
          </LI>
        ))}
      </UL>
    </div>
  );
};

export default Log;
