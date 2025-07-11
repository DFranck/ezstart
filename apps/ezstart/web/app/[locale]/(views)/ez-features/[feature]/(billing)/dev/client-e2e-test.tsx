'use client';
import { callApi } from '@/utils/call-api';
import { BillingClient, Client } from '@ezstart/types';
import { Button, Input, LI, UL } from '@ezstart/ui/components';
import { useApiAction } from '@ezstart/ui/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
type Props = {
  pushLog: (msg: string) => void;
  filter?: 'active' | 'deletedOnly' | 'all';
};

export function ClientE2ETest({ pushLog, filter }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientName, setClientName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedIsCompany, setUpdatedIsCompany] = useState(false);
  const [updatedAddress, setUpdatedAddress] = useState('');
  const [updatedTaxNumber, setUpdatedTaxNumber] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const { exec, error, setError } = useApiAction(); // 👈

  // Log helper

  const fetchClients = async (f = filter) => {
    const query: any = {};
    if (f === 'deletedOnly') query.deletedOnly = true;
    if (f === 'all') query.includeDeleted = true;
    pushLog(`fetchClients(${f})`);
    const data = await exec<Client[]>(() =>
      callApi<BillingClient[]>('/api/clients', { query })
    );
    if (data) setClients(data);
    else setClients([]);
    pushLog(`GET /api/clients → ${JSON.stringify(data)}`);
  };

  const createClient = async () => {
    const payload = {
      clientName,
      isCompany,
      address: isCompany ? address : undefined,
      taxNumber: isCompany ? taxNumber : undefined,
    };

    pushLog(`POST /api/clients ${JSON.stringify(payload)}`);

    const data = await exec<BillingClient>(() =>
      callApi<BillingClient>('/api/clients', {
        method: 'POST',
        body: payload,
      })
    );

    if (data) {
      setClientName('');
      setIsCompany(false);
      setAddress('');
      setTaxNumber('');
      fetchClients();
      toast.success('Client created!');
    }
  };

  const getClientById = async (id: string) => {
    pushLog(`GET /api/clients/${id}`);
    const data = await exec<Client>(() =>
      callApi<Client>(`/api/clients/${id}`)
    );
    pushLog(`GET → ${JSON.stringify(data)}`);
    if (data) alert(`Client: ${JSON.stringify(data, null, 2)}`);
  };

  const updateClient = async (id: string) => {
    pushLog(`PUT /api/clients/${id} { clientName: "${updatedName}" }`);
    const data = await exec<BillingClient>(() =>
      callApi<BillingClient>(`/api/clients/${id}`, {
        method: 'PUT',
        body: {
          clientName: updatedName,
          isCompany: updatedIsCompany,
          address: updatedIsCompany ? updatedAddress : undefined,
          taxNumber: updatedIsCompany ? updatedTaxNumber : undefined,
        },
      })
    );
    pushLog(`PUT → ${JSON.stringify(data)}`);
    if (data) {
      fetchClients();
      setUpdatedName('');
      setSelectedId(null);
      toast.success('Client updated!');
    }
  };

  const deleteClient = async (id: string) => {
    pushLog(`DELETE /api/clients/${id}`);
    await exec(() => callApi(`/api/clients/${id}`, { method: 'DELETE' }));
    fetchClients();
    toast.success('Client deleted!');
  };

  const restoreClient = async (id: string) => {
    pushLog(`POST /api/clients/${id}/restore`);
    await exec(() => callApi(`/api/clients/${id}/restore`, { method: 'POST' }));
    fetchClients();
    toast.success('Client restored!');
  };

  const hardDeleteClient = async (id: string) => {
    pushLog(`DELETE /api/clients/${id}/hard-delete`);
    await exec(() =>
      callApi(`/api/clients/${id}/hard-delete`, { method: 'DELETE' })
    );
    fetchClients();
    toast.success('Client hard deleted!');
  };

  // --- Filters / useEffect ---
  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line
  }, [filter]);

  return (
    <>
      <>
        {error && (
          <pre className='text-destructive col-span-2 text-center'>{error}</pre>
        )}
        <div className='flex flex-col md:flex-row gap-2'>
          <div className='flex flex-col md:flex-row gap-2'>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder='Client name'
            />
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={isCompany}
                onChange={(e) => setIsCompany(e.target.checked)}
              />
              Is Company
            </label>
          </div>

          {isCompany && (
            <div className='flex flex-col md:flex-row gap-2 pt-2'>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder='Company address'
              />
              <Input
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder='Tax number'
              />
            </div>
          )}
          <div className='grid grid-cols-2 gap-2'>
            <Button
              onClick={createClient}
              disabled={
                !clientName.trim() ||
                (isCompany && (!address.trim() || !taxNumber.trim()))
              }
            >
              Create
            </Button>

            <Button onClick={() => fetchClients()}>Reload</Button>
          </div>
        </div>

        <UL className='p-0 pt-2'>
          {clients.map((c) => (
            <LI
              key={c._id}
              className='flex flex-col md:flex-row items-center justify-between gap-2'
              variant={'card'}
            >
              {selectedId === c._id ? (
                // Affiche le formulaire d'édition INLINE ici si c'est le bon id
                <div className='flex flex-col md:flex-row gap-2 w-full'>
                  <div className='flex flex-col gap-2 w-full'>
                    <Input
                      value={updatedName}
                      onChange={(e) => setUpdatedName(e.target.value)}
                      placeholder='New client name'
                    />
                    <label className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={updatedIsCompany}
                        onChange={(e) => setUpdatedIsCompany(e.target.checked)}
                      />
                      Is Company
                    </label>

                    {updatedIsCompany && (
                      <>
                        <Input
                          value={updatedAddress}
                          onChange={(e) => setUpdatedAddress(e.target.value)}
                          placeholder='Company address'
                        />
                        <Input
                          value={updatedTaxNumber}
                          onChange={(e) => setUpdatedTaxNumber(e.target.value)}
                          placeholder='Tax number'
                        />
                      </>
                    )}
                  </div>

                  <div className='grid grid-cols-2 gap-2'>
                    <Button
                      onClick={() => updateClient(selectedId)}
                      disabled={
                        !updatedName.trim() ||
                        (updatedIsCompany &&
                          (!updatedAddress.trim() || !updatedTaxNumber.trim()))
                      }
                    >
                      Update
                    </Button>

                    <Button
                      variant='ghost'
                      onClick={() => {
                        setSelectedId(null);
                        setUpdatedName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <span
                    className='cursor-pointer font-mono text-xs truncate max-w-xs'
                    title={JSON.stringify(c, null, 2)}
                    onClick={() => getClientById(c._id)}
                  >
                    {c.clientName}{' '}
                    <span className='text-gray-400'>({_idShort(c._id)})</span>
                    {c.deletedAt && (
                      <span className='ml-1 text-red-500 text-xs'>
                        (deleted)
                      </span>
                    )}
                  </span>
                  <div className='grid grid-cols-2 md:flex gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setSelectedId(c._id);
                        setUpdatedName(c.clientName ?? '');
                        setUpdatedIsCompany(c.isCompany ?? false);
                        setUpdatedAddress(c.address ?? '');
                        setUpdatedTaxNumber(c.taxNumber ?? '');
                      }}
                      disabled={!!c.deletedAt}
                    >
                      Edit
                    </Button>
                    <Button
                      size='sm'
                      variant='destructive'
                      onClick={() => deleteClient(c._id)}
                      disabled={!!c.deletedAt}
                    >
                      Soft Delete
                    </Button>
                    {c.deletedAt && (
                      <>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => restoreClient(c._id)}
                        >
                          Restore
                        </Button>
                        <Button
                          size='sm'
                          variant='destructive'
                          onClick={() => hardDeleteClient(c._id)}
                        >
                          Hard Delete
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </LI>
          ))}
        </UL>
      </>
    </>
  );
}

// Helper pour rendre les ids plus lisibles
function _idShort(id: string) {
  return id ? id.slice(-6) : '';
}
