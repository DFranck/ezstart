import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components';
import { ClientE2ETest } from './client-e2e-test';
import { InvoiceE2ETest } from './invoice-e2e-test';

export const Dashboard = () => {
  return (
    <Tabs defaultValue='client'>
      <TabsList>
        <TabsTrigger value='client'>client</TabsTrigger>
        <TabsTrigger value='invoice'>invoice</TabsTrigger>
      </TabsList>
      <TabsContent value='client'>
        <ClientE2ETest />
      </TabsContent>
      <TabsContent value='invoice'>
        <InvoiceE2ETest />
      </TabsContent>
    </Tabs>
  );
};
