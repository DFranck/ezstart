'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { BillingProvider } from '@/providers/billing-provider';
import { Button, H1, H2, Header, Icon, LI, Main, P, Section, UL } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import Link from 'next/link';
import { useState } from 'react';
import ClientCard from './dashboard/components/client-card';

const HomePage = () => {
  return (
    <BillingProvider>
      <HomeWithData />
    </BillingProvider>
  );
};

const HomeWithData = () => {
  const { 
    clients, 
    invoices, 
    quotes, 
    receipts, 
    loading, 
    selectedClient, 
    setSelectedClient,
    refetchAll
  } = useBillingContext();
  
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  const hasClients = clients && clients.length > 0;
  const hasAnyData = hasClients || invoices?.length > 0 || quotes?.length > 0 || receipts?.length > 0;

  return (
    <>
      <Header
        className={cn('h-14 bg-muted border-y sticky top-0')}
        leftContent={
          <H1 size={'h5'} asChild className='text-start w-fit'>
            <Link href='/'>EzBilling</Link>
          </H1>
        }
        centerContent={
          selectedClient ? (
            <Button onClick={() => setSelectedClient(null)} variant={'ghost'}>
              <H2 size={'h5'}>{selectedClient.clientName}</H2>
            </Button>
          ) : null
        }
        rightContent={
          hasClients ? (
            <Button onClick={() => setIsClientModalOpen(true)}>
              <Icon name='fa:FaPlus' /> New client
            </Button>
          ) : null
        }
      />
      
      <Main className='flex-1 p-6'>
        {loading ? (
          <Section>
            <P>Loading...</P>
          </Section>
        ) : (
          <>
            {!selectedClient && (
              <Section>
                {!hasClients ? (
                  <div className='flex flex-col items-center justify-center min-h-[400px] gap-4'>
                    <H2>Welcome to EzBilling</H2>
                    <P className='text-muted-foreground text-center max-w-md'>
                      Get started by creating your first client to begin managing invoices, quotes, and receipts.
                    </P>
                    <Button size='lg' onClick={() => setIsClientModalOpen(true)}>
                      <Icon name='fa:FaPlus' /> Create your first client
                    </Button>
                  </div>
                ) : (
                  <div className='space-y-6'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <H2>Clients Dashboard</H2>
                        <P className='text-muted-foreground'>Select a client to manage their invoices and quotes</P>
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        {clients?.length} client{clients?.length !== 1 ? 's' : ''} total
                      </div>
                    </div>
                    
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                      {clients?.map((client) => (
                        <div
                          key={client._id}
                          onClick={() => setSelectedClient(client)}
                          className='group relative bg-card border rounded-lg p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50'
                        >
                          <div className='flex items-start justify-between mb-4'>
                            <div className='flex items-center gap-3'>
                              {client.isCompany ? (
                                <div className='w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center'>
                                  <Icon name='fa:FaBuilding' className='text-blue-600' size={16} />
                                </div>
                              ) : (
                                <div className='w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center'>
                                  <Icon name='fa:FaUser' className='text-green-600' size={16} />
                                </div>
                              )}
                              <div>
                                <h3 className='font-semibold text-sm group-hover:text-primary transition-colors'>
                                  {client.clientName}
                                </h3>
                                <p className='text-xs text-muted-foreground'>
                                  {client.isCompany ? 'Company' : 'Individual'}
                                </p>
                              </div>
                            </div>
                            <Icon name='fa:FaChevronRight' className='text-muted-foreground group-hover:text-primary transition-colors' size={12} />
                          </div>
                          
                          <div className='space-y-2'>
                            {client.email && (
                              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                <Icon name='fa:FaEnvelope' size={10} />
                                <span className='truncate'>{client.email}</span>
                              </div>
                            )}
                            {client.phone && (
                              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                <Icon name='fa:FaPhone' size={10} />
                                <span>{client.phone}</span>
                              </div>
                            )}
                            {client.city && (
                              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                <Icon name='fa:FaMapMarkerAlt' size={10} />
                                <span>{client.city}{client.country && `, ${client.country}`}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className='flex items-center justify-between mt-4 pt-4 border-t'>
                            <div className='flex gap-4 text-xs'>
                              <div>
                                <span className='font-medium'>{invoices?.filter(i => i.clientId === client._id).length || 0}</span>
                                <span className='text-muted-foreground ml-1'>invoices</span>
                              </div>
                              <div>
                                <span className='font-medium'>{quotes?.filter(q => q.clientId === client._id).length || 0}</span>
                                <span className='text-muted-foreground ml-1'>quotes</span>
                              </div>
                            </div>
                            <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                              <span className='text-xs text-primary font-medium'>View Details</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {selectedClient && (
              <Section>
                {/* Breadcrumb */}
                <div className='flex items-center gap-2 mb-6 text-sm text-muted-foreground'>
                  <button 
                    onClick={() => setSelectedClient(null)}
                    className='hover:text-primary transition-colors flex items-center gap-1'
                  >
                    <Icon name='fa:FaArrowLeft' size={12} />
                    All Clients
                  </button>
                  <Icon name='fa:FaChevronRight' size={10} />
                  <span className='text-foreground font-medium'>{selectedClient.clientName}</span>
                </div>

                {/* Client Header */}
                <div className='flex items-start justify-between mb-8'>
                  <div className='flex items-center gap-4'>
                    {selectedClient.isCompany ? (
                      <div className='w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center'>
                        <Icon name='fa:FaBuilding' className='text-blue-600' size={24} />
                      </div>
                    ) : (
                      <div className='w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center'>
                        <Icon name='fa:FaUser' className='text-green-600' size={24} />
                      </div>
                    )}
                    <div>
                      <H2 className='mb-1'>{selectedClient.clientName}</H2>
                      <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                        <span>{selectedClient.isCompany ? 'Company' : 'Individual'}</span>
                        {selectedClient.email && (
                          <>
                            <span>•</span>
                            <span>{selectedClient.email}</span>
                          </>
                        )}
                        {selectedClient.city && (
                          <>
                            <span>•</span>
                            <span>{selectedClient.city}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="outline" onClick={() => setIsClientModalOpen(true)}>
                    <Icon name='fa:FaEdit' size={14} />
                    Edit Client
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
                  <Button size='lg' className='h-auto p-6 flex-col gap-3' onClick={() => {/* TODO: Open invoice modal */}}>
                    <div className='w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center'>
                      <Icon name='fa:FaFileInvoiceDollar' className='text-blue-600' size={20} />
                    </div>
                    <div className='text-center'>
                      <div className='font-semibold'>New Invoice</div>
                      <div className='text-sm text-muted-foreground'>Create a new invoice</div>
                    </div>
                  </Button>
                  
                  <Button size='lg' variant='outline' className='h-auto p-6 flex-col gap-3' onClick={() => {/* TODO: Open quote modal */}}>
                    <div className='w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center'>
                      <Icon name='fa:FaFileAlt' className='text-orange-600' size={20} />
                    </div>
                    <div className='text-center'>
                      <div className='font-semibold'>New Quote</div>
                      <div className='text-sm text-muted-foreground'>Create a new quote</div>
                    </div>
                  </Button>
                  
                  <Button size='lg' variant='outline' className='h-auto p-6 flex-col gap-3' onClick={() => {/* TODO: Open receipt modal */}}>
                    <div className='w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center'>
                      <Icon name='fa:FaReceipt' className='text-green-600' size={20} />
                    </div>
                    <div className='text-center'>
                      <div className='font-semibold'>New Receipt</div>
                      <div className='text-sm text-muted-foreground'>Record a payment</div>
                    </div>
                  </Button>
                </div>

                {/* Stats */}
                <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
                  <div className='bg-card border rounded-lg p-6'>
                    <div className='flex items-center justify-between mb-2'>
                      <H2 size={'h6'} className='text-muted-foreground'>Total Invoices</H2>
                      <Icon name='fa:FaFileInvoiceDollar' className='text-blue-600' size={16} />
                    </div>
                    <P className='text-3xl font-bold text-blue-600'>{invoices?.filter(i => i.clientId === selectedClient._id).length || 0}</P>
                  </div>
                  
                  <div className='bg-card border rounded-lg p-6'>
                    <div className='flex items-center justify-between mb-2'>
                      <H2 size={'h6'} className='text-muted-foreground'>Total Quotes</H2>
                      <Icon name='fa:FaFileAlt' className='text-orange-600' size={16} />
                    </div>
                    <P className='text-3xl font-bold text-orange-600'>{quotes?.filter(q => q.clientId === selectedClient._id).length || 0}</P>
                  </div>
                  
                  <div className='bg-card border rounded-lg p-6'>
                    <div className='flex items-center justify-between mb-2'>
                      <H2 size={'h6'} className='text-muted-foreground'>Total Receipts</H2>
                      <Icon name='fa:FaReceipt' className='text-green-600' size={16} />
                    </div>
                    <P className='text-3xl font-bold text-green-600'>{receipts?.filter(r => r.clientId === selectedClient._id).length || 0}</P>
                  </div>
                  
                  <div className='bg-card border rounded-lg p-6'>
                    <div className='flex items-center justify-between mb-2'>
                      <H2 size={'h6'} className='text-muted-foreground'>Total Revenue</H2>
                      <Icon name='fa:FaChartLine' className='text-purple-600' size={16} />
                    </div>
                    <P className='text-3xl font-bold text-purple-600'>€0.00</P>
                  </div>
                </div>

                {/* Recent Documents */}
                <div className='space-y-6'>
                  <H2 size={'h5'}>Recent Documents</H2>
                  
                  <div className='bg-card border rounded-lg p-6'>
                    <div className='text-center py-8 text-muted-foreground'>
                      <Icon name='fa:FaFileAlt' size={48} className='mx-auto mb-4 opacity-20' />
                      <p>No documents yet</p>
                      <p className='text-sm mt-1'>Create your first invoice or quote to get started</p>
                    </div>
                  </div>
                </div>
              </Section>
            )}
          </>
        )}
      </Main>

    </>
  );
};

export default HomePage;