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
const ClientCard = ({ client }: Props) => {
  return (
    <Card className='w-full cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border-gray-200'>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className='text-lg font-semibold text-foreground line-clamp-1 mb-2'>
            {client.clientName}
          </CardTitle>
          <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Icon name={client.isCompany ? 'lucide:Building2' : 'lucide:User'} className="w-3 h-3 mr-1" />
            {client.isCompany ? 'Company' : 'Individual'}
          </div>
        </div>
        
        <CardDescription className="space-y-2">
          {client.email && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Icon name="lucide:Mail" className="w-4 h-4 mr-2 text-muted-foreground/60" />
              <Link 
                href={`mailto:${client.email}`} 
                className="hover:text-primary transition-colors truncate"
              >
                {client.email}
              </Link>
            </div>
          )}
          
          {client.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Icon name="lucide:Phone" className="w-4 h-4 mr-2 text-muted-foreground/60" />
              <Link 
                href={`tel:${client.phone}`} 
                className="hover:text-primary transition-colors"
              >
                {client.phone}
              </Link>
            </div>
          )}
          
          {client.address && (
            <div className="flex items-start text-sm text-muted-foreground">
              <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground/60 flex-shrink-0" />
              <Link
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  client.address
                )}`}
                target='_blank'
                rel='noopener noreferrer'
                className="hover:text-primary transition-colors line-clamp-2"
              >
                {client.address}
              </Link>
            </div>
          )}
          
          {client.city && client.country && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Icon name="lucide:Globe" className="w-4 h-4 mr-2 text-muted-foreground/60" />
              <span>{client.city}, {client.country}</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      
      {client.website && (
        <CardContent className="pt-0">
          <div className="flex items-center text-sm text-primary">
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
