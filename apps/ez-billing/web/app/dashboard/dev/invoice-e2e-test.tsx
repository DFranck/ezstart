'use client';
import { callApi } from '@ezstart/ui/utils';
import { Invoice } from '@ez-billing/types';
import { Button, Input, LI, UL } from '@ezstart/ui/components';
import { useApiAction } from '@ezstart/ui/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
type Props = {
  pushLog: (msg: string) => void;
  filter?: 'active' | 'deletedOnly' | 'all';
};
export function InvoiceE2ETest({ pushLog, filter }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedNotes, setUpdatedNotes] = useState('');

  const { exec, error } = useApiAction();

  const fetchInvoices = async (f = filter) => {
    const query: any = {};
    if (f === 'deletedOnly') query.deletedOnly = true;
    if (f === 'all') query.includeDeleted = true;
    // pushLog(`fetchInvoices(${f})`);
    const data = await exec<Invoice[]>(() =>
      callApi<Invoice[]>('/invoices', { query })
    );
    setInvoices(data ?? []);
    // pushLog(`GET /invoices → ${JSON.stringify(data)}`);
  };

  const createInvoice = async () => {
    pushLog(
      `POST /invoices { clientId: "${clientId}", notes: "${notes}" }`
    );
    const data = await exec<Invoice>(() =>
      callApi<Invoice>('/invoices', {
        method: 'POST',
        body: {
          clientId: clientId.trim(),
          items: [{ label: 'Test Item', quantity: 1, price: 42 }],
          currency: 'EUR',
          notes: notes.trim(),
          status: 'draft',
          taxRate: 20,
        },
      })
    );
    // pushLog(`POST → ${JSON.stringify(data)}`);
    if (data) {
      setClientId('');
      setNotes('');
      fetchInvoices();
      toast.success('Invoice created!');
    }
  };

  const getInvoiceById = async (id: string) => {
    pushLog(`GET /invoices/${id}`);
    const data = await exec<Invoice>(() =>
      callApi<Invoice>(`/invoices/${id}`)
    );
    // pushLog(`GET → ${JSON.stringify(data)}`);
    if (data) alert(`Invoice: ${JSON.stringify(data, null, 2)}`);
  };

  const updateInvoice = async (id: string) => {
    pushLog(`PUT /invoices/${id} { notes: "${updatedNotes}" }`);
    const data = await exec<Invoice>(() =>
      callApi<Invoice>(`/invoices/${id}`, {
        method: 'PUT',
        body: { notes: updatedNotes },
      })
    );
    // pushLog(`PUT → ${JSON.stringify(data)}`);
    if (data) {
      fetchInvoices();
      setUpdatedNotes('');
      setSelectedId(null);
      toast.success('Invoice updated!');
    }
  };

  const deleteInvoice = async (id: string) => {
    pushLog(`DELETE /invoices/${id}`);
    await exec(() => callApi(`/invoices/${id}`, { method: 'DELETE' }));
    fetchInvoices();
    toast.success('Invoice deleted!');
  };

  const restoreInvoice = async (id: string) => {
    pushLog(`POST /invoices/${id}/restore`);
    await exec(() =>
      callApi(`/invoices/${id}/restore`, { method: 'POST' })
    );
    fetchInvoices();
    toast.success('Invoice restored!');
  };

  const hardDeleteInvoice = async (id: string) => {
    pushLog(`DELETE /invoices/${id}/hard-delete`);
    await exec(() =>
      callApi(`/invoices/${id}/hard-delete`, { method: 'DELETE' })
    );
    fetchInvoices();
    toast.success('Invoice hard deleted!');
  };

  const assignClient = async (id: string) => {
    pushLog(`POST /invoices/${id}/assign-client`);
    const data = await exec<Invoice>(() =>
      callApi(`/invoices/${id}/assign-client`, {
        method: 'POST',
        body: { clientId: clientId.trim() },
      })
    );
    // pushLog(`assignClient → ${JSON.stringify(data)}`);
    fetchInvoices();
    setClientId('');
    toast.success('Client assigned!');
  };

  const addLineItem = async (id: string) => {
    pushLog(`POST /invoices/${id}/add-line-item`);
    const data = await exec<Invoice>(() =>
      callApi(`/invoices/${id}/add-line-item`, {
        method: 'POST',
        body: { label: 'LineX', quantity: 1, price: 11 },
      })
    );
    // pushLog(`addLineItem → ${JSON.stringify(data)}`);
    fetchInvoices();
    toast.success('line item added!');
  };

  const removeLineItem = async (id: string) => {
    pushLog(`POST /invoices/${id}/remove-line-item`);
    const invoice = invoices.find((i) => i._id === id);
    const firstItem = invoice?.items?.[0];
    if (!firstItem) return pushLog('No item to remove');
    await exec(() =>
      callApi(`/invoices/${id}/remove-line-item`, {
        method: 'POST',
        body: { itemId: firstItem._id },
      })
    );
    fetchInvoices();
    toast.success('line item removed!');
  };

  const markPaid = async (id: string) => {
    pushLog(`POST /invoices/${id}/mark-paid`);
    await exec(() =>
      callApi(`/invoices/${id}/mark-paid`, { method: 'POST' })
    );
    fetchInvoices();
    toast.success('Invoice marked as paid!');
  };

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  return (
    <>
      {' '}
      {error && (
        <pre className='text-destructive col-span-2 text-center'>{error}</pre>
      )}
      <div className='flex flex-col md:flex-row gap-2'>
        <Input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder='clientId (ObjectId)'
        />
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='notes'
        />
        <div className='grid grid-cols-2 md:flex gap-2'>
          <Button onClick={createInvoice}>Create</Button>
          <Button onClick={() => fetchInvoices()}>Reload</Button>
        </div>
      </div>
      <UL className='p-0 pt-2'>
        {invoices.map((inv) => (
          <LI
            key={inv._id}
            className='flex flex-col md:flex-row items-center justify-between gap-2'
            variant={'card'}
          >
            {selectedId === inv._id ? (
              // Bloc édition inline
              <div className='flex flex-col md:flex-row gap-2 w-full'>
                <Input
                  value={updatedNotes}
                  onChange={(e) => setUpdatedNotes(e.target.value)}
                  placeholder='New notes'
                />
                <div className='grid grid-cols-2 gap-2'>
                  <Button
                    onClick={() => updateInvoice(selectedId)}
                    disabled={!updatedNotes.trim()}
                  >
                    Update Note
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
              </div>
            ) : (
              <>
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
                <div className='grid grid-cols-2 md:flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      setSelectedId(inv._id);
                      setUpdatedNotes(inv.notes ?? '');
                    }}
                  >
                    Update Note
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
                </div>
              </>
            )}
          </LI>
        ))}
      </UL>
    </>
  );
}

// Helper pour rendre les ids plus lisibles
function _idShort(id: string) {
  return id ? id.slice(-6) : '';
}
