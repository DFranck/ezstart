'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components';
import { useState } from 'react';
import { ClientE2ETest } from './client-e2e-test';
import { InvoiceE2ETest } from './invoice-e2e-test';
import { QuoteE2ETest } from './quote-e2e-test';
import { ReceiptE2ETest } from './receipt-e2e-test';

export const E2EPlayground = ({
  pushLog,
}: {
  pushLog: (msg: string) => void;
}) => {
  const [filter, setFilter] = useState<'active' | 'deletedOnly' | 'all'>(
    'active'
  );
  return (
    <Tabs defaultValue='client'>
      <div className='flex flex-col gap-2 md:flex-row'>
        <TabsList>
          <TabsTrigger value='client'>Client</TabsTrigger>
          <TabsTrigger value='invoice'>Invoice</TabsTrigger>
          <TabsTrigger value='quote'>Quote</TabsTrigger>
          <TabsTrigger value='receipt'>Receipt</TabsTrigger>
        </TabsList>{' '}
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className='w-44'>
            Filter:
            <span className='font-semibold ml-2'>
              {filter === 'active'
                ? 'Active only'
                : filter === 'deletedOnly'
                  ? 'Deleted only'
                  : 'All'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='active'>Active only</SelectItem>
            <SelectItem value='deletedOnly'>Deleted only</SelectItem>
            <SelectItem value='all'>All (active + deleted)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <TabsContent value='client'>
        <ClientE2ETest pushLog={pushLog} filter={filter} />
      </TabsContent>
      <TabsContent value='invoice'>
        <InvoiceE2ETest pushLog={pushLog} filter={filter} />
      </TabsContent>
      <TabsContent value='quote'>
        <QuoteE2ETest pushLog={pushLog} filter={filter} />
      </TabsContent>
      <TabsContent value='receipt'>
        <ReceiptE2ETest pushLog={pushLog} filter={filter} />
      </TabsContent>
    </Tabs>
  );
};
