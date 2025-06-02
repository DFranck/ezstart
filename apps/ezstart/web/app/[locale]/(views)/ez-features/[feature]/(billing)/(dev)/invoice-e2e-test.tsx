'use client';
import { callApi } from '@/utils/call-api';
import { Invoice } from '@ezstart/types';
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

export function InvoiceE2ETest() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedNotes, setUpdatedNotes] = useState('');
  const [filter, setFilter] = useState<'active' | 'deletedOnly' | 'all'>(
    'active'
  );

  const { exec, error } = useApiAction();

  const pushLog = (msg: string) =>
    setLog((logs) => [`${new Date().toISOString()} > ${msg}`, ...logs]);

  const fetchInvoices = async (f = filter) => {
    let query: any = {};
    if (f === 'deletedOnly') query.deletedOnly = true;
    if (f === 'all') query.includeDeleted = true;
    pushLog(`fetchInvoices(${f})`);
    const data = await exec<Invoice[]>(() =>
      callApi<Invoice[]>('/api/invoices', { query })
    );
    setInvoices(data ?? []);
    pushLog(`GET /api/invoices → ${JSON.stringify(data)}`);
  };

  const createInvoice = async () => {
    pushLog(
      `POST /api/invoices { clientId: "${clientId}", notes: "${notes}" }`
    );
    const data = await exec<Invoice>(() =>
      callApi<Invoice>('/api/invoices', {
        method: 'POST',
        body: {
          clientId: clientId.trim() || '6658c5d78904c1234567abcd', // 👈 default valid if vide
          items: [{ label: 'Test Item', quantity: 1, price: 42 }],
          currency: 'EUR',
          notes: notes.trim(),
          status: 'draft',
        },
      })
    );
    pushLog(`POST → ${JSON.stringify(data)}`);
    if (data) {
      setClientId('');
      setNotes('');
      fetchInvoices();
    }
  };

  const getInvoiceById = async (id: string) => {
    pushLog(`GET /api/invoices/${id}`);
    const data = await exec<Invoice>(() =>
      callApi<Invoice>(`/api/invoices/${id}`)
    );
    pushLog(`GET → ${JSON.stringify(data)}`);
    if (data) alert(`Invoice: ${JSON.stringify(data, null, 2)}`);
  };

  const updateInvoice = async (id: string) => {
    pushLog(`PUT /api/invoices/${id} { notes: "${updatedNotes}" }`);
    const data = await exec<Invoice>(() =>
      callApi<Invoice>(`/api/invoices/${id}`, {
        method: 'PUT',
        body: { notes: updatedNotes },
      })
    );
    pushLog(`PUT → ${JSON.stringify(data)}`);
    if (data) {
      fetchInvoices();
      setUpdatedNotes('');
      setSelectedId(null);
    }
  };

  const deleteInvoice = async (id: string) => {
    pushLog(`DELETE /api/invoices/${id}`);
    await exec(() => callApi(`/api/invoices/${id}`, { method: 'DELETE' }));
    fetchInvoices();
  };

  const restoreInvoice = async (id: string) => {
    pushLog(`POST /api/invoices/${id}/restore`);
    await exec(() =>
      callApi(`/api/invoices/${id}/restore`, { method: 'POST' })
    );
    fetchInvoices();
  };

  const hardDeleteInvoice = async (id: string) => {
    pushLog(`DELETE /api/invoices/${id}/hard-delete`);
    await exec(() =>
      callApi(`/api/invoices/${id}/hard-delete`, { method: 'DELETE' })
    );
    fetchInvoices();
  };

  const assignClient = async (id: string) => {
    pushLog(`POST /api/invoices/${id}/assign-client`);
    const data = await exec<Invoice>(() =>
      callApi(`/api/invoices/${id}/assign-client`, {
        method: 'POST',
        body: { clientId: clientId.trim() || '6658c5d78904c1234567abcd' },
      })
    );
    pushLog(`assignClient → ${JSON.stringify(data)}`);
    fetchInvoices();
  };

  const addLineItem = async (id: string) => {
    pushLog(`POST /api/invoices/${id}/add-line-item`);
    const data = await exec<Invoice>(() =>
      callApi(`/api/invoices/${id}/add-line-item`, {
        method: 'POST',
        body: { label: 'LineX', quantity: 1, price: 11 },
      })
    );
    pushLog(`addLineItem → ${JSON.stringify(data)}`);
    fetchInvoices();
  };

  const removeLineItem = async (id: string) => {
    pushLog(`POST /api/invoices/${id}/remove-line-item`);
    const invoice = invoices.find((i) => i._id === id);
    const firstItem = invoice?.items?.[0];
    if (!firstItem) return pushLog('No item to remove');
    await exec(() =>
      callApi(`/api/invoices/${id}/remove-line-item`, {
        method: 'POST',
        body: { itemId: firstItem._id ?? 'item-1' }, // adapt si tu as un _id sur tes line items
      })
    );
    fetchInvoices();
  };

  const markPaid = async (id: string) => {
    pushLog(`POST /api/invoices/${id}/mark-paid`);
    await exec(() =>
      callApi(`/api/invoices/${id}/mark-paid`, { method: 'POST' })
    );
    fetchInvoices();
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line
  }, [filter]);

  return (
    <Section variant='card' className='space-y-4'>
      <div className='flex gap-2 items-center'>
        <Input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder='clientId (ObjectId)'
          className='w-48'
        />
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='notes'
          className='w-48'
        />
        <Button onClick={createInvoice}>Create</Button>
        <Button onClick={() => fetchInvoices()}>Reload</Button>
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
        {invoices.map((inv) => (
          <Li key={inv._id} className='py-2 flex items-center gap-2'>
            <span
              className='cursor-pointer font-mono text-xs truncate max-w-xs'
              title={JSON.stringify(inv, null, 2)}
              onClick={() => getInvoiceById(inv._id)}
            >
              {_idShort(inv._id)}
              {inv.deletedAt && (
                <span className='ml-1 text-red-500 text-xs'>(deleted)</span>
              )}
            </span>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setSelectedId(inv._id)}
            >
              Edit
            </Button>
            <Button
              size='sm'
              variant='destructive'
              onClick={() => deleteInvoice(inv._id)}
              disabled={!!inv.deletedAt}
            >
              Soft Delete
            </Button>
            <Button size='sm' onClick={() => assignClient(inv._id)}>
              Assign Client
            </Button>
            <Button size='sm' onClick={() => addLineItem(inv._id)}>
              Add Item
            </Button>
            <Button size='sm' onClick={() => removeLineItem(inv._id)}>
              Remove Item
            </Button>
            <Button size='sm' onClick={() => markPaid(inv._id)}>
              Mark Paid
            </Button>
            {inv.deletedAt && (
              <>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => restoreInvoice(inv._id)}
                >
                  Restore
                </Button>
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={() => hardDeleteInvoice(inv._id)}
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
            value={updatedNotes}
            onChange={(e) => setUpdatedNotes(e.target.value)}
            placeholder='New notes'
            className='w-48'
          />
          <Button
            onClick={() => updateInvoice(selectedId)}
            disabled={!updatedNotes.trim()}
          >
            Update
          </Button>
          <Button
            variant='ghost'
            onClick={() => {
              setSelectedId(null);
              setUpdatedNotes('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      <Section variant='card' className='mt-4'>
        <h4 className='font-bold mb-2'>Logs</h4>
        <Ul className='text-xs text-gray-500 overflow-auto bg-gray-900 rounded p-2'>
          {log.map((l, i) => (
            <Li key={i} size='sm'>
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
