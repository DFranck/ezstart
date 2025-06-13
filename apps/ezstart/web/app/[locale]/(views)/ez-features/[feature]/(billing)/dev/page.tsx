'use client';
import { H1, H4, LI, Main, Section, UL } from '@ezstart/ui/components';
import { useState } from 'react';
import { E2EPlayground } from './e2e-playground';

const pageDev = () => {
  const [log, setLog] = useState<string[]>([]);
  const pushLog = (msg: string) =>
    setLog((logs) => [`${new Date().toISOString()} > ${msg}`, ...logs]);
  return (
    <Main withHeaderOffset className='mt-20'>
      <H1>E2E Playground</H1>
      <Section size={'full'}>
        <Section size={'full'}>
          <E2EPlayground pushLog={pushLog} />
        </Section>
      </Section>
      <Section size={'full'}>
        <UL variant={'outline'}>
          <H4>Logs</H4>
          {log.map((l, i) => (
            <LI key={i} size='sm' variant={'card'} className='overflow-auto'>
              {l}
            </LI>
          ))}
        </UL>
      </Section>
    </Main>
  );
};

export default pageDev;
