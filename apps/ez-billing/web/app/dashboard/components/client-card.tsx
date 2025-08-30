import { Client } from '@ez-billing/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LI,
  UL,
} from '@ezstart/ui/components';
import Link from 'next/link';

type Props = { client: Client };
const ClientCard = ({ client }: Props) => {
  console.log('client', client);
  return (
    <Card className='w-52 cursor-pointer hover:opacity-80 active:scale-95'>
      <CardHeader>
        <CardTitle className='line-clamp-1'>{client.clientName}</CardTitle>
        <CardDescription>
          <UL size={'default'}>
            {client.phone && (
              <LI>
                <Link href={`tel:${client.phone}`}>{client.phone}</Link>
              </LI>
            )}
            {client.address && (
              <LI>
                <Link
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    client.address
                  )}`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {client.address}
                </Link>
              </LI>
            )}
          </UL>
        </CardDescription>
      </CardHeader>
      <CardContent></CardContent>
    </Card>
  );
};

export default ClientCard;
