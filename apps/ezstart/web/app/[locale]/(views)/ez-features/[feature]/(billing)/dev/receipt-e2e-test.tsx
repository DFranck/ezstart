'use client';
import { callApi } from '@/utils/call-api';
import { Receipt } from '@ezstart/types';
import { Button, Input, Li, Ul } from '@ezstart/ui/components';
import { useApiAction } from '@ezstart/ui/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Props = {
  pushLog: (msg: string) => void;
  filter?: 'active' | 'deletedOnly' | 'all';
};

export function ReceiptE2ETest({ pushLog, filter }: Props) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedNotes, setUpdatedNotes] = useState('');

  const { exec, error } = useApiAction();

  const fetchReceipts = async (f = filter) => {
    let query: any = {};
    if (f === 'deletedOnly') query.deletedOnly = true;
    if (f === 'all') query.includeDeleted = true;
    pushLog(`fetchReceipts(${f})`);
    const data = await exec<Receipt[]>(() =>
      callApi<Receipt[]>('/api/receipts', { query })
    );
    setReceipts(data ?? []);
    pushLog(`GET /api/receipts → ${JSON.stringify(data)}`);
  };

  const createReceipt = async () => {
    pushLog(
      `POST /api/receipts { clientId: "${clientId}", notes: "${notes}" }`
    );
    const data = await exec<Receipt>(() =>
      callApi<Receipt>('/api/receipts', {
        method: 'POST',
        body: {
          clientId: clientId.trim(),
          items: [{ label: 'Test Item', quantity: 1, price: 42 }],
          currency: 'EUR',
          notes: notes.trim(),
          status: 'issued',
          taxRate: 10,
        },
      })
    );
    pushLog(`POST → ${JSON.stringify(data)}`);
    if (data) {
      setClientId('');
      setNotes('');
      fetchReceipts();
      toast.success('Receipt created!');
    }
  };

  const getReceiptById = async (id: string) => {
    pushLog(`GET /api/receipts/${id}`);
    const data = await exec<Receipt>(() =>
      callApi<Receipt>(`/api/receipts/${id}`)
    );
    pushLog(`GET → ${JSON.stringify(data)}`);
    if (data) alert(`Receipt: ${JSON.stringify(data, null, 2)}`);
  };

  const updateReceipt = async (id: string) => {
    pushLog(`PUT /api/receipts/${id} { notes: "${updatedNotes}" }`);
    const data = await exec<Receipt>(() =>
      callApi<Receipt>(`/api/receipts/${id}`, {
        method: 'PUT',
        body: { notes: updatedNotes },
      })
    );
    pushLog(`PUT → ${JSON.stringify(data)}`);
    if (data) {
      fetchReceipts();
      setUpdatedNotes('');
      setSelectedId(null);
      toast.success('Receipt updated!');
    }
  };

  const deleteReceipt = async (id: string) => {
    pushLog(`DELETE /api/receipts/${id}`);
    await exec(() => callApi(`/api/receipts/${id}`, { method: 'DELETE' }));
    fetchReceipts();
    toast.success('Receipt deleted!');
  };

  const restoreReceipt = async (id: string) => {
    pushLog(`POST /api/receipts/${id}/restore`);
    await exec(() =>
      callApi(`/api/receipts/${id}/restore`, { method: 'POST' })
    );
    fetchReceipts();
    toast.success('Receipt restored!');
  };

  const hardDeleteReceipt = async (id: string) => {
    pushLog(`DELETE /api/receipts/${id}/hard-delete`);
    await exec(() =>
      callApi(`/api/receipts/${id}/hard-delete`, { method: 'DELETE' })
    );
    fetchReceipts();
    toast.success('Receipt hard deleted!');
  };

  const assignClient = async (id: string) => {
    pushLog(`POST /api/receipts/${id}/assign-client`);
    const data = await exec<Receipt>(() =>
      callApi(`/api/receipts/${id}/assign-client`, {
        method: 'POST',
        body: { clientId: clientId.trim() },
      })
    );
    fetchReceipts();
    setClientId('');
    pushLog(`assignClient → ${JSON.stringify(data)}`);
    if (data?.clientId) {
      toast.success('Client assigned!');
    }
  };

  const addLineItem = async (id: string) => {
    pushLog(`POST /api/receipts/${id}/add-line-item`);
    const data = await exec<Receipt>(() =>
      callApi(`/api/receipts/${id}/add-line-item`, {
        method: 'POST',
        body: { label: 'LineX', quantity: 1, price: 11 },
      })
    );
    pushLog(`addLineItem → ${JSON.stringify(data)}`);
    fetchReceipts();
    toast.success('Line item added!');
  };

  const removeLineItem = async (id: string) => {
    pushLog(`POST /api/receipts/${id}/remove-line-item`);
    const receipt = receipts.find((q) => q._id === id);
    const firstItem = receipt?.items?.[0];
    if (!firstItem) return pushLog('No item to remove');
    await exec(() =>
      callApi(`/api/receipts/${id}/remove-line-item`, {
        method: 'POST',
        body: { itemId: firstItem._id },
      })
    );
    fetchReceipts();
    toast.success('Line item removed!');
  };

  // NEW: Accept/Reject actions
  const issueReceipt = async (id: string) => {
    pushLog(`POST /api/receipts/${id}/mark-issued`);
    await exec(() =>
      callApi(`/api/receipts/${id}/mark-issued`, { method: 'POST' })
    );
    fetchReceipts();
    toast.success('Receipt issued!');
  };

  const refundReceipt = async (id: string) => {
    pushLog(`POST /api/receipts/${id}/mark-refunded`);
    await exec(() =>
      callApi(`/api/receipts/${id}/mark-refunded`, { method: 'POST' })
    );
    fetchReceipts();
    toast.success('Receipt refunded!');
  };

  useEffect(() => {
    fetchReceipts();
    // eslint-disable-next-line
  }, [filter]);

  return (
    <>
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
          <Button onClick={createReceipt}>Create</Button>
          <Button onClick={() => fetchReceipts()}>Reload</Button>
        </div>
      </div>
      <Ul className='p-0 pt-2' size={'full'}>
        {receipts.map((q) => (
          <Li
            key={q._id}
            className='flex flex-col md:flex-row items-center justify-between gap-2'
            variant={'card'}
          >
            {selectedId === q._id ? (
              // Bloc édition inline
              <div className='flex flex-col md:flex-row gap-2 w-full'>
                <Input
                  value={updatedNotes}
                  onChange={(e) => setUpdatedNotes(e.target.value)}
                  placeholder='New notes'
                />
                <div className='grid grid-cols-2 gap-2'>
                  <Button
                    onClick={() => updateReceipt(selectedId)}
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
                  title={JSON.stringify(q, null, 2)}
                  onClick={() => getReceiptById(q._id)}
                >
                  {_idShort(q._id)}
                  {q.deletedAt && (
                    <span className='ml-1 text-red-500 text-xs'>(deleted)</span>
                  )}
                </span>
                <div className='grid grid-cols-2 md:flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      setSelectedId(q._id);
                      setUpdatedNotes(q.notes ?? '');
                    }}
                  >
                    Update Note
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    onClick={() => deleteReceipt(q._id)}
                    disabled={!!q.deletedAt}
                  >
                    Soft Delete
                  </Button>
                  <Button size='sm' onClick={() => assignClient(q._id)}>
                    Assign Client
                  </Button>
                  <Button size='sm' onClick={() => addLineItem(q._id)}>
                    Add Item
                  </Button>
                  <Button size='sm' onClick={() => removeLineItem(q._id)}>
                    Remove Item
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => issueReceipt(q._id)}
                  >
                    Issue
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    onClick={() => refundReceipt(q._id)}
                  >
                    Refound
                  </Button>
                  {q.deletedAt && (
                    <>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => restoreReceipt(q._id)}
                      >
                        Restore
                      </Button>
                      <Button
                        size='sm'
                        variant='destructive'
                        onClick={() => hardDeleteReceipt(q._id)}
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
  );
}

// Helper pour rendre les ids plus lisibles
function _idShort(id: string) {
  return id ? id.slice(-6) : '';
}
