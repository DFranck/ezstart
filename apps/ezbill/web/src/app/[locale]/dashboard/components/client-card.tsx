import { Client } from '@ezbill/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
} from '@ezstart/ui/components';
import Link from 'next/link';

type Props = { client: Client };
const ClientCard = ({ client }: Props): any => {
  return (
    <Card className={`w-full cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${
      client.isCompany
        ? 'border-ezbill-company/20 hover:border-ezbill-company/40'
        : 'border-ezbill-client/20 hover:border-ezbill-client/40'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className='text-lg font-semibold text-foreground line-clamp-1 mb-2'>
            {client.clientName}
          </CardTitle>
          <div className={`flex items-center text-xs px-2 py-1 rounded-full border ${
            client.isCompany
              ? 'bg-ezbill-company/10 text-ezbill-company border-ezbill-company/30'
              : 'bg-ezbill-client/10 text-ezbill-client border-ezbill-client/30'
          }`}>
            <Icon name={client.isCompany ? 'lucide:Building2' : 'lucide:User'} className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
            {client.isCompany ? 'Company' : 'Individual'}
          </div>
        </div>

        <CardDescription className="space-y-2">
          {client.email && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Icon name="lucide:Mail" className={`w-4 h-4 mr-2 ${client.isCompany ? 'text-ezbill-company/60' : 'text-ezbill-client/60'}`} />
              <Link
                href={`mailto:${client.email}`}
                className={`transition-colors truncate ${client.isCompany ? 'hover:text-ezbill-company' : 'hover:text-ezbill-client'}`}
              >
                {client.email}
              </Link>
            </div>
          )}

          {client.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Icon name="lucide:Phone" className={`w-4 h-4 mr-2 ${client.isCompany ? 'text-ezbill-company/60' : 'text-ezbill-client/60'}`} />
              <Link
                href={`tel:${client.phone}`}
                className={`transition-colors ${client.isCompany ? 'hover:text-ezbill-company' : 'hover:text-ezbill-client'}`}
              >
                {client.phone}
              </Link>
            </div>
          )}

          {client.address && (
            <div className="flex items-start text-sm text-muted-foreground">
              <Icon name="lucide:MapPin" className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${client.isCompany ? 'text-ezbill-company/60' : 'text-ezbill-client/60'}`} />
              <Link
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  client.address
                )}`}
                target='_blank'
                rel='noopener noreferrer'
                className={`transition-colors line-clamp-2 ${client.isCompany ? 'hover:text-ezbill-company' : 'hover:text-ezbill-client'}`}
              >
                {client.address}
              </Link>
            </div>
          )}

          {client.city && client.country && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Icon name="lucide:Globe" className={`w-4 h-4 mr-2 ${client.isCompany ? 'text-ezbill-company/60' : 'text-ezbill-client/60'}`} />
              <span>{client.city}, {client.country}</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>

      {client.website && (
        <CardContent className="pt-0">
          <div className={`flex items-center text-sm ${client.isCompany ? 'text-ezbill-company' : 'text-ezbill-client'}`}>
            <Icon name="lucide:ExternalLink" className="w-4 h-4 mr-2" />
            <Link
              href={client.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline truncate"
            >
              Visit website
            </Link>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ClientCard;
