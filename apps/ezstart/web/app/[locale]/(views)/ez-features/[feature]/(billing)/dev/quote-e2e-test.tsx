'use client';
import { callApi } from '@/utils/call-api';
import { Quote } from '@ezstart/types';
import { Button, Input, Li, Ul } from '@ezstart/ui/components';
import { useApiAction } from '@ezstart/ui/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Props = {
  pushLog: (msg: string) => void;
  filter?: 'active' | 'deletedOnly' | 'all';
};

export function QuoteE2ETest({ pushLog, filter }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedNotes, setUpdatedNotes] = useState('');

  const { exec, error } = useApiAction();

  const fetchQuotes = async (f = filter) => {
    let query: any = {};
    if (f === 'deletedOnly') query.deletedOnly = true;
    if (f === 'all') query.includeDeleted = true;
    pushLog(`fetchQuotes(${f})`);
    const data = await exec<Quote[]>(() =>
      callApi<Quote[]>('/api/quotes', { query })
    );
    setQuotes(data ?? []);
    pushLog(`GET /api/quotes → ${JSON.stringify(data)}`);
  };

  const createQuote = async () => {
    pushLog(`POST /api/quotes { clientId: "${clientId}", notes: "${notes}" }`);
    const data = await exec<Quote>(() =>
      callApi<Quote>('/api/quotes', {
        method: 'POST',
        body: {
          clientId: clientId.trim(),
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
      fetchQuotes();
      toast.success('Quote created!');
    }
  };

  const getQuoteById = async (id: string) => {
    pushLog(`GET /api/quotes/${id}`);
    const data = await exec<Quote>(() => callApi<Quote>(`/api/quotes/${id}`));
    pushLog(`GET → ${JSON.stringify(data)}`);
    if (data) alert(`Quote: ${JSON.stringify(data, null, 2)}`);
  };

  const updateQuote = async (id: string) => {
    pushLog(`PUT /api/quotes/${id} { notes: "${updatedNotes}" }`);
    const data = await exec<Quote>(() =>
      callApi<Quote>(`/api/quotes/${id}`, {
        method: 'PUT',
        body: { notes: updatedNotes },
      })
    );
    pushLog(`PUT → ${JSON.stringify(data)}`);
    if (data) {
      fetchQuotes();
      setUpdatedNotes('');
      setSelectedId(null);
      toast.success('Quote updated!');
    }
  };

  const deleteQuote = async (id: string) => {
    pushLog(`DELETE /api/quotes/${id}`);
    await exec(() => callApi(`/api/quotes/${id}`, { method: 'DELETE' }));
    fetchQuotes();
    toast.success('Quote deleted!');
  };

  const restoreQuote = async (id: string) => {
    pushLog(`POST /api/quotes/${id}/restore`);
    await exec(() => callApi(`/api/quotes/${id}/restore`, { method: 'POST' }));
    fetchQuotes();
    toast.success('Quote restored!');
  };

  const hardDeleteQuote = async (id: string) => {
    pushLog(`DELETE /api/quotes/${id}/hard-delete`);
    await exec(() =>
      callApi(`/api/quotes/${id}/hard-delete`, { method: 'DELETE' })
    );
    fetchQuotes();
    toast.success('Quote hard deleted!');
  };

  const assignClient = async (id: string) => {
    pushLog(`POST /api/quotes/${id}/assign-client`);
    const data = await exec<Quote>(() =>
      callApi(`/api/quotes/${id}/assign-client`, {
        method: 'POST',
        body: { clientId: clientId.trim() },
      })
    );
    pushLog(`assignClient → ${JSON.stringify(data)}`);
    fetchQuotes();
    setClientId('');
    toast.success('Client assigned!');
  };

  const addLineItem = async (id: string) => {
    pushLog(`POST /api/quotes/${id}/add-line-item`);
    const data = await exec<Quote>(() =>
      callApi(`/api/quotes/${id}/add-line-item`, {
        method: 'POST',
        body: { label: 'LineX', quantity: 1, price: 11 },
      })
    );
    pushLog(`addLineItem → ${JSON.stringify(data)}`);
    fetchQuotes();
    toast.success('Line item added!');
  };

  const removeLineItem = async (id: string) => {
    pushLog(`POST /api/quotes/${id}/remove-line-item`);
    const quote = quotes.find((q) => q._id === id);
    const firstItem = quote?.items?.[0];
    if (!firstItem) return pushLog('No item to remove');
    await exec(() =>
      callApi(`/api/quotes/${id}/remove-line-item`, {
        method: 'POST',
        body: { itemId: firstItem._id },
      })
    );
    fetchQuotes();
    toast.success('Line item removed!');
  };

  // NEW: Accept/Reject actions
  const acceptQuote = async (id: string) => {
    pushLog(`POST /api/quotes/${id}/accept`);
    await exec(() => callApi(`/api/quotes/${id}/accept`, { method: 'POST' }));
    fetchQuotes();
    toast.success('Quote accepted!');
  };

  const rejectQuote = async (id: string) => {
    pushLog(`POST /api/quotes/${id}/reject`);
    await exec(() => callApi(`/api/quotes/${id}/reject`, { method: 'POST' }));
    fetchQuotes();
    toast.success('Quote rejected!');
  };

  useEffect(() => {
    fetchQuotes();
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
          <Button onClick={createQuote}>Create</Button>
          <Button onClick={() => fetchQuotes()}>Reload</Button>
        </div>
      </div>
      <Ul className='p-0 pt-2' size={'full'} layout={'stacked'}>
        {quotes.map((q) => (
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
                    onClick={() => updateQuote(selectedId)}
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
                  onClick={() => getQuoteById(q._id)}
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
                    onClick={() => deleteQuote(q._id)}
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
                    onClick={() => acceptQuote(q._id)}
                  >
                    Accept
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    onClick={() => rejectQuote(q._id)}
                  >
                    Reject
                  </Button>
                  {q.deletedAt && (
                    <>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => restoreQuote(q._id)}
                      >
                        Restore
                      </Button>
                      <Button
                        size='sm'
                        variant='destructive'
                        onClick={() => hardDeleteQuote(q._id)}
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
