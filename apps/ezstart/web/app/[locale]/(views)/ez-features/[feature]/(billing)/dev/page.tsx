'use client';
import { H1, H4, Li, Main, Section, Ul } from '@ezstart/ui/components';
import { useState } from 'react';
import { E2EPlayground } from './e2e-playground';

const pageDev = () => {
  const [log, setLog] = useState<string[]>([]);
  const pushLog = (msg: string) =>
    setLog((logs) => [`${new Date().toISOString()} > ${msg}`, ...logs]);
  return (
    <Main padding className='mt-20'>
      <H1>E2E Playground</H1>
      <Section size={'full'}>
        <Section variant={'outline'} size={'full'}>
          <E2EPlayground pushLog={pushLog} />
        </Section>
      </Section>
      <Section size={'full'}>
        <Ul variant={'outline'} size={'full'} layout={'stacked'}>
          <H4>Logs</H4>
          {log.map((l, i) => (
            <Li key={i} size='sm' variant={'card'} className='overflow-auto'>
              {l}
            </Li>
          ))}
        </Ul>
      </Section>
    </Main>
  );
};

export default pageDev;
