'use client';
import { callApi } from '@/utils/call-api';
import { Client } from '@ezstart/types';
import {
  Button,
  Input,
  Li,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Ul,
} from '@ezstart/ui/components';
import { useApiAction } from '@ezstart/ui/hooks';
import { useEffect, useState } from 'react';

export function ClientE2ETest() {
  const [clients, setClients] = useState<Client[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedName, setUpdatedName] = useState('');
  const [filter, setFilter] = useState<'active' | 'deletedOnly' | 'all'>(
    'active'
  );

  const { exec, error, setError } = useApiAction(); // 👈

  // Log helper
  const pushLog = (msg: string) =>
    setLog((logs) => [`${new Date().toISOString()} > ${msg}`, ...logs]);

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
      // toast is auto from useApiAction in case of error
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
    }
  };

  const deleteClient = async (id: string) => {
    pushLog(`DELETE /api/clients/${id}`);
    await exec(() => callApi(`/api/clients/${id}`, { method: 'DELETE' }));
    fetchClients();
  };

  const restoreClient = async (id: string) => {
    pushLog(`POST /api/clients/${id}/restore`);
    await exec(() => callApi(`/api/clients/${id}/restore`, { method: 'POST' }));
    fetchClients();
  };

  const hardDeleteClient = async (id: string) => {
    pushLog(`DELETE /api/clients/${id}/hard-delete`);
    await exec(() =>
      callApi(`/api/clients/${id}/hard-delete`, { method: 'DELETE' })
    );
    fetchClients();
  };

  // --- Filters / useEffect ---
  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line
  }, [filter]);

  return (
    <Section variant='card' className='space-y-4'>
      <div className='flex gap-2 items-center'>
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder='companyName'
          className='w-48'
        />
        <Button onClick={createClient}>Create</Button>
        <Button onClick={() => fetchClients()}>Reload</Button>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className='w-44 ml-2'>
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
      {error && <pre className='text-red-500'>{error}</pre>}

      <Ul className='divide-y'>
        {clients.map((c) => (
          <Li key={c._id} className='py-2 flex items-center gap-2'>
            <span
              className='cursor-pointer font-mono text-xs truncate max-w-xs'
              title={JSON.stringify(c, null, 2)}
              onClick={() => getClientById(c._id)}
            >
              {c.companyName}{' '}
              <span className='text-gray-400'>({_idShort(c._id)})</span>
              {c.deletedAt && (
                <span className='ml-1 text-red-500 text-xs'>(deleted)</span>
              )}
            </span>
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
          </Li>
        ))}
      </Ul>

      {selectedId && (
        <div className='flex gap-2 items-center border-t pt-2'>
          <Input
            value={updatedName}
            onChange={(e) => setUpdatedName(e.target.value)}
            placeholder='New companyName'
            className='w-48'
          />
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
      )}

      <Section variant='card' className='mt-4'>
        <h4 className='font-bold mb-2'>Logs</h4>
        <Ul className='text-xs text-gray-500  overflow-auto bg-gray-900 rounded p-2'>
          {log.map((l, i) => (
            <Li key={i} size={'sm'}>
              {l}
            </Li>
          ))}
        </Ul>
      </Section>
    </Section>
  );
}

// Helper pour rendre les ids plus lisibles
function _idShort(id: string) {
  return id ? id.slice(-6) : '';
}
