'use client';
import { useBillingContext } from '@/contexts/billing-context';
import { useUserStore } from '@/stores/useUserStore';
import { CompanyModal } from '@/components/company-modal';
import { ClientModal } from '@/components/client-modal';
import { Button, H2, H3, LI, P, Section, UL } from '@ezstart/ui/components';
import { Company, Client } from '@ez-billing/types';
import { useState } from 'react';
import { redirect } from 'next/navigation';
import ClientCard from './components/client-card';

const BillingPage = () => {
  const { user } = useUserStore();
  const { clients, companies, selectedClient, setSelectedClient, refetchAll, loading } = useBillingContext();
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  
  if (!user) {
    redirect('/');
    return null;
  }

  const isClients = clients && clients.length > 0;
  const hasCompanies = companies && companies.length > 0;

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsCompanyModalOpen(true);
  };

  const handleCompanyModalClose = () => {
    setIsCompanyModalOpen(false);
    setEditingCompany(undefined);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleClientModalClose = () => {
    setIsClientModalOpen(false);
    setEditingClient(undefined);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {!selectedClient && (
        <>
          <Section>
            <div className="flex justify-between items-center mb-4">
              <H2>Your Companies</H2>
              <Button onClick={() => setIsCompanyModalOpen(true)}>
                Create Company
              </Button>
            </div>
            
            {hasCompanies ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                  <div 
                    key={company._id} 
                    className="p-4 border rounded-lg hover:shadow-md cursor-pointer"
                    onClick={() => handleEditCompany(company)}
                  >
                    <H3>{company.companyName}</H3>
                    <P>{company.email}</P>
                    <P>{company.city}, {company.country}</P>
                  </div>
                ))}
              </div>
            ) : (
              <P>Create your first company to start billing</P>
            )}
          </Section>

          <Section>
            <div className="flex justify-between items-center mb-4">
              <H2>Clients</H2>
            </div>
            
            {isClients ? (
              <>
                <P className="mb-4">Select a client to create invoices and quotes</P>
                <UL layout={'row'}>
                  {clients?.map((client) => (
                    <LI key={client._id}>
                      <div className="relative">
                        <div onClick={() => setSelectedClient(client)}>
                          <ClientCard client={client} />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClient(client);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </LI>
                  ))}
                </UL>
              </>
            ) : (
              <P>Create your first client to start</P>
            )}
          </Section>
        </>
      )}

      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={handleCompanyModalClose}
        company={editingCompany}
        onSave={refetchAll}
      />
      
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={handleClientModalClose}
        client={editingClient}
        onSave={refetchAll}
      />
    </>
  );
};

export default BillingPage;
