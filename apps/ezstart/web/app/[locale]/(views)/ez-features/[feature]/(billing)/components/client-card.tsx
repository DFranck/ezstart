import { Client } from '@ezstart/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ezstart/ui/components';

type Props = { client: Client };
const ClientCard = ({ client }: Props) => {
  return (
    <Card className='w-full cursor-pointer hover:opacity-80 active:scale-95'>
      <CardHeader>
        <CardTitle>{client.companyName}</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent></CardContent>
    </Card>
  );
};

export default ClientCard;
