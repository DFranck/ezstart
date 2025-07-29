'use client';
<<<<<<< HEAD
import { useBillingContext } from '@/app/[locale]/(views)/ez-features/[feature]/(billing)/contexts/billing-context';
import { H2, LI, Modal, P, Section, UL } from '@ezstart/ui/components';
=======
import { useBillingContext } from '@/contexts/billing-context';
import { H2, LI, P, Section, UL } from '@ezstart/ui/components';
>>>>>>> master
import ClientCard from './components/client-card';

export const BillingPage = () => {
  const { clients, selectedClient, setSelectedClient } = useBillingContext();
  const isClients = clients.length > 0;
  return (
    <>
      {!selectedClient && (
        <Section>
          {isClients ? (
            <H2>Select a client</H2>
          ) : (
            <P>Create your first client to start</P>
          )}
          <UL layout={'row'}>
            {clients.map((client) => (
              <LI key={client._id} onClick={() => setSelectedClient(client)}>
                <ClientCard client={client} />
              </LI>
            ))}
          </UL>
<<<<<<< HEAD
          <Modal open={true} onClose={() => {}}>
            modal
          </Modal>
=======
>>>>>>> master
        </Section>
      )}
    </>
  );
};
