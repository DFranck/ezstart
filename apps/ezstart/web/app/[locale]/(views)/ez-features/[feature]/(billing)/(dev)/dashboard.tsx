import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components';
import { ClientE2ETest } from './client-e2e-test';

const dashboard = () => {
  return (
    <Tabs defaultValue='client' className='w-[400px]'>
      <TabsList>
        <TabsTrigger value='client'>client</TabsTrigger>
        <TabsTrigger value='invoice'>invoice</TabsTrigger>
      </TabsList>
      <TabsContent value='client'>
        <ClientE2ETest />
      </TabsContent>
      <TabsContent value='invoice'>invoice.</TabsContent>
    </Tabs>
  );
};

export default dashboard;
