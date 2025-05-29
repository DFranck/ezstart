'use client';
import { Client } from '@ezstart/types';
import { Button, Input, Li, Section, Ul } from '@ezstart/ui/components';
import { useEffect, useState } from 'react';

export function ClientDemo() {
  const [clients, setClients] = useState<Client[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    const res = await fetch('http://localhost:5000/api/clients');
    setClients(await res.json());
  };

  const createClient = async () => {
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setCompanyName('');
        fetchClients();
      } else {
        setError(JSON.stringify(data));
      }
    } catch {
      setError('Network error');
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <Section variant={'card'}>
      <Input
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder='companyName'
      />
      <Button onClick={createClient}>Create</Button>
      <Button onClick={fetchClients}>Reload</Button>
      {error && <pre>{error}</pre>}
      <Ul>
        {clients.map((c) => (
          <Li key={c._id}>{JSON.stringify(c)}</Li>
        ))}
      </Ul>
    </Section>
  );
}
