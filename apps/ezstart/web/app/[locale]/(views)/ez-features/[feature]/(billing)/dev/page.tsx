'use client';
import { H1, H4, LI, Section, UL } from '@ezstart/ui/components';
import { useState } from 'react';
import { E2EPlayground } from './e2e-playground';

const pageDev = () => {
  const [log, setLog] = useState<string[]>([]);
  const pushLog = (msg: string) =>
    setLog((logs) => [`${new Date().toISOString()} > ${msg}`, ...logs]);
  return (
    <>
      <H1>E2E Playground</H1>
      <Section>
        <E2EPlayground pushLog={pushLog} />
      </Section>
      <Section>
        <UL variant={'outline'}>
          <H4>Logs</H4>
          {log.map((l, i) => (
            <LI key={i} size='sm' variant={'card'} className='overflow-auto'>
              {l}
            </LI>
          ))}
        </UL>
      </Section>
    </>
  );
};

export default pageDev;
