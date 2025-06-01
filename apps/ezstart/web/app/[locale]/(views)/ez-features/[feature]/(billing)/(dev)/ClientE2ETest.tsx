'use client';
import { getApiUrl } from '@/utils/get-api-url';
import { Client } from '@ezstart/types';
import { Button, Input, Li, Section, Ul } from '@ezstart/ui/components';
import { useEffect, useState } from 'react';

export function ClientE2ETest() {
  const [clients, setClients] = useState<Client[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedName, setUpdatedName] = useState('');

  // Log helper
  const pushLog = (msg: string) =>
    setLog((logs) => [`${new Date().toISOString()} > ${msg}`, ...logs]);

  const fetchClients = async () => {
    pushLog('fetchClients()');
    const res = await fetch(`${getApiUrl()}/api/clients`);
    const data = await res.json();
    setClients(data);
    pushLog(`GET /api/clients → ${JSON.stringify(data)}`);
  };

  const createClient = async () => {
    setError(null);
    pushLog(`POST /api/clients { companyName: "${companyName}" }`);
    try {
      const res = await fetch(`${getApiUrl()}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName }),
      });
      const data = await res.json();
      pushLog(`POST status: ${res.status} → ${JSON.stringify(data)}`);
      if (res.status === 201) {
        setCompanyName('');
        fetchClients();
      } else {
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Network error');
      pushLog(`POST error: ${err}`);
    }
  };

  const getClientById = async (id: string) => {
    pushLog(`GET /api/clients/${id}`);
    try {
      const res = await fetch(`${getApiUrl()}/api/clients/${id}`);
      const data = await res.json();
      pushLog(`GET status: ${res.status} → ${JSON.stringify(data)}`);
      if (res.status === 200) {
        alert(`Client: ${JSON.stringify(data, null, 2)}`);
      } else {
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Network error');
      pushLog(`GET error: ${err}`);
    }
  };

  const updateClient = async (id: string) => {
    pushLog(`PUT /api/clients/${id} { companyName: "${updatedName}" }`);
    try {
      const res = await fetch(`${getApiUrl()}/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: updatedName }),
      });
      const data = await res.json();
      pushLog(`PUT status: ${res.status} → ${JSON.stringify(data)}`);
      if (res.status === 200) {
        fetchClients();
        setUpdatedName('');
        setSelectedId(null);
      } else {
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Network error');
      pushLog(`PUT error: ${err}`);
    }
  };

  const deleteClient = async (id: string) => {
    pushLog(`DELETE /api/clients/${id}`);
    try {
      const res = await fetch(`${getApiUrl()}/api/clients/${id}`, {
        method: 'DELETE',
      });
      if (res.status === 204) {
        pushLog('DELETE success: 204 No Content');
        fetchClients();
        return;
      }
      const data = await res.json();
      pushLog(`DELETE status: ${res.status} → ${JSON.stringify(data)}`);
      if (res.status === 200) {
        fetchClients();
      } else {
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Network error');
      pushLog(`DELETE error: ${err}`);
    }
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line
  }, []);

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
        <Button onClick={fetchClients}>Reload</Button>
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
            </span>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setSelectedId(c._id);
                setUpdatedName(c.companyName ?? '');
              }}
            >
              Edit
            </Button>
            <Button
              size='sm'
              variant='destructive'
              onClick={() => deleteClient(c._id)}
            >
              Delete
            </Button>
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
