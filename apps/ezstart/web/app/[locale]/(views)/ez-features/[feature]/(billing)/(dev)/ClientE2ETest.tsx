'use client';
import { callApi } from '@/utils/call-api';
import { isApiError } from '@/utils/is-api-error';
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
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function ClientE2ETest() {
  const [clients, setClients] = useState<Client[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedName, setUpdatedName] = useState('');
  const [filter, setFilter] = useState<'active' | 'deletedOnly' | 'all'>(
    'active'
  );

  // Log helper
  const pushLog = (msg: string) =>
    setLog((logs) => [`${new Date().toISOString()} > ${msg}`, ...logs]);
  const fetchClients = async (f = filter) => {
    let query: any = {};
    if (f === 'deletedOnly') query.deletedOnly = true;
    if (f === 'all') query.includeDeleted = true;
    pushLog(`fetchClients(${f})`);
    const { data } = await callApi<Client[]>('/api/clients', { query });

    // ** Type guard : check si erreur **
    if (Array.isArray(data)) {
      setClients(data);
      setError(null);
    } else if (data && typeof data === 'object' && 'error' in data) {
      setClients([]); // tu veux peut-être garder les clients précédents ou vider (au choix)
      setError(data.error);
      toast.error('Error: ' + data.error);
    } else {
      setClients([]);
      setError('Unknown API response');
      toast.error('Unknown API response');
    }
    pushLog(`GET /api/clients → ${JSON.stringify(data)}`);
  };

  const createClient = async () => {
    setError(null);
    pushLog(`POST /api/clients { companyName: "${companyName}" }`);
    const { status, data } = await callApi<Client>('/api/clients', {
      method: 'POST',
      body: { companyName },
    });
    pushLog(`POST status: ${status} → ${JSON.stringify(data)}`);
    if (status === 201) {
      setCompanyName('');
      fetchClients();
      toast.success('Client created: ' + data.companyName);
    } else if (isApiError(data)) {
      setError(data.error);
      toast.error(data.error);
    } else {
      setError(JSON.stringify(data));
      toast.error('Unknown error');
    }
  };

  const getClientById = async (id: string) => {
    pushLog(`GET /api/clients/${id}`);
    const { status, data } = await callApi<Client>(`/api/clients/${id}`);
    pushLog(`GET status: ${status} → ${JSON.stringify(data)}`);
    if (status === 200) {
      alert(`Client: ${JSON.stringify(data, null, 2)}`);
    } else if (isApiError(data)) {
      setError(data.error);
      toast.error(data.error);
    } else {
      setError(JSON.stringify(data));
      toast.error('Unknown error');
    }
  };

  const updateClient = async (id: string) => {
    pushLog(`PUT /api/clients/${id} { companyName: "${updatedName}" }`);
    const { status, data } = await callApi<Client>(`/api/clients/${id}`, {
      method: 'PUT',
      body: { companyName: updatedName },
    });
    pushLog(`PUT status: ${status} → ${JSON.stringify(data)}`);
    if (status === 200) {
      fetchClients();
      setUpdatedName('');
      setSelectedId(null);
      toast.success('Client updated: ' + data.companyName);
    } else if (isApiError(data)) {
      setError(data.error);
      toast.error(data.error);
    } else {
      setError(JSON.stringify(data));
      toast.error('Unknown error');
    }
  };

  const deleteClient = async (id: string) => {
    pushLog(`DELETE /api/clients/${id}`);
    const { status, data } = await callApi(`/api/clients/${id}`, {
      method: 'DELETE',
    });
    if (status === 204) {
      pushLog('DELETE success: 204 No Content');
      fetchClients();
      toast.success('Client deleted');
      return;
    }
    pushLog(`DELETE status: ${status} → ${JSON.stringify(data)}`);
    setError(JSON.stringify(data));
    if (isApiError(data)) {
      setError(data.error);
      toast.error(data.error);
    }
  };

  const restoreClient = async (id: string) => {
    pushLog(`POST /api/clients/${id}/restore`);
    const { status, data } = await callApi(`/api/clients/${id}/restore`, {
      method: 'POST',
    });
    pushLog(`RESTORE status: ${status} → ${JSON.stringify(data)}`);
    if (status === 200) {
      fetchClients();
      toast.success('Client restored: ' + data.companyName);
    } else if (isApiError(data)) {
      setError(data.error);
      toast.error(data.error);
    } else {
      setError(JSON.stringify(data));
      toast.error('Unknown error');
    }
  };

  const hardDeleteClient = async (id: string) => {
    pushLog(`DELETE /api/clients/${id}/hard-delete`);
    const { status, data } = await callApi(`/api/clients/${id}/hard-delete`, {
      method: 'DELETE',
    });
    if (status === 200 || status === 204) {
      pushLog('HARD DELETE success');
      fetchClients();
      toast.success('Client hard deleted');
      return;
    }
    pushLog(`HARD DELETE status: ${status} → ${JSON.stringify(data)}`);
    setError(JSON.stringify(data));
    if (isApiError(data)) {
      setError(data.error);
      toast.error(data.error);
    }
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
