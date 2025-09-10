import { Client } from '@ez-billing/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  H3,
  Icon,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'

type Props = {
  client: Client
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onClick: (client: Client) => void
  className?: string
}

const ClientCard = ({ client, onEdit, onDelete, onClick, className }: Props) => {
  return (
    <div key={client._id} className="group relative">
      <Card
        onClick={() => onClick(client)}
        className={cn(
          'hover:shadow-xl cursor-pointer transition-all duration-300 hover:border-cyan-200 group-hover:-translate-y-1',
          className
        )}
      >
        <CardHeader className="flex items-center justify-between">
          <H3 size={'h6'} className="line-clamp-1 text-left">
            {client.clientName}
          </H3>
          {/* Client Type Badge */}
          <Badge variant={client.isCompany ? 'purple' : 'success'} className="font-bold">
            {client.isCompany ? 'Company' : 'Individual'}
          </Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 hidden">
          {/* Client Avatar */}
          {client.email && (
            <p className="text-muted-foreground text-sm mb-1 line-clamp-1">{client.email}</p>
          )}
          {client.city && client.country && (
            <p className="text-muted-foreground/80 text-sm line-clamp-1">
              {client.city}, {client.country}
            </p>
          )}
        </CardContent>
        {/* Floating Actions */}
        <CardFooter className="md:flex gap-2 justify-end hidden">
          <Button
            size="sm"
            variant="outline"
            className="bg-card backdrop-blur-sm shadow-lg border-0"
            onClick={e => {
              e.stopPropagation()
              onEdit(client)
            }}
          >
            <Icon name="lucide:Edit" className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-background/90 backdrop-blur-sm shadow-lg border-0 text-destructive hover:bg-destructive/10"
            onClick={e => {
              e.stopPropagation()
              onDelete(client)
            }}
          >
            <Icon name="lucide:Trash2" className="w-3 h-3" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default ClientCard
