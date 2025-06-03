'use client';
import { callApi } from '@/utils/call-api';
import { Client } from '@ezstart/types';
import { Button, Input, Li, Ul } from '@ezstart/ui/components';
import { useApiAction } from '@ezstart/ui/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
type Props = {
  pushLog: (msg: string) => void;
  filter?: 'active' | 'deletedOnly' | 'all';
};

export function ClientE2ETest({ pushLog, filter }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedName, setUpdatedName] = useState('');

  const { exec, error, setError } = useApiAction(); // 👈

  // Log helper

  const fetchClients = async (f = filter) => {
    let query: any = {};
    if (f === 'deletedOnly') query.deletedOnly = true;
    if (f === 'all') query.includeDeleted = true;
    pushLog(`fetchClients(${f})`);
    const data = await exec<Client[]>(() =>
      callApi<Client[]>('/api/clients', { query })
    );
    if (data) setClients(data);
    else setClients([]);
    pushLog(`GET /api/clients → ${JSON.stringify(data)}`);
  };

  const createClient = async () => {
    pushLog(`POST /api/clients { companyName: "${companyName}" }`);
    const data = await exec<Client>(() =>
      callApi<Client>('/api/clients', {
        method: 'POST',
        body: { companyName },
      })
    );
    pushLog(`POST → ${JSON.stringify(data)}`);
    if (data) {
      setCompanyName('');
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
    pushLog(`PUT /api/clients/${id} { companyName: "${updatedName}" }`);
    const data = await exec<Client>(() =>
      callApi<Client>(`/api/clients/${id}`, {
        method: 'PUT',
        body: { companyName: updatedName },
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
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder='companyName'
          />
          <div className='grid grid-cols-2 gap-2'>
            <Button onClick={createClient}>Create</Button>
            <Button onClick={() => fetchClients()}>Reload</Button>
          </div>
        </div>

        <Ul className='p-0 pt-2' size={'full'} layout={'stacked'}>
          {clients.map((c) => (
            <Li
              key={c._id}
              className='flex flex-col md:flex-row items-center justify-between gap-2'
              variant={'card'}
            >
              {selectedId === c._id ? (
                // Affiche le formulaire d'édition INLINE ici si c'est le bon id
                <div className='flex flex-col md:flex-row gap-2 w-full'>
                  <Input
                    value={updatedName}
                    onChange={(e) => setUpdatedName(e.target.value)}
                    placeholder='New companyName'
                  />
                  <div className='grid grid-cols-2 gap-2'>
                    <Button
                      onClick={() => updateClient(selectedId)}
                      disabled={!updatedName.trim()}
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
                    {c.companyName}{' '}
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
                        setUpdatedName(c.companyName ?? '');
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
            </Li>
          ))}
        </Ul>
      </>
    </>
  );
}

// Helper pour rendre les ids plus lisibles
function _idShort(id: string) {
  return id ? id.slice(-6) : '';
}
