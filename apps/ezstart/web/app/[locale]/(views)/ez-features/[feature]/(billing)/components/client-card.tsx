import { Client } from '@ezstart/types';

type Props = { client: Client };
const ClientCard = ({ client }: Props) => {
  return <div>{client.companyName}</div>;
};

export default ClientCard;
