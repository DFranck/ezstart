import { Client } from '@ezbill/types'
import { Badge, Button, Card, CardContent, Icon, Div, H3, P } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'

type Props = {
  client: Client
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onClick: (client: Client) => void
  className?: string
}

const ClientCard = ({ client, onEdit, onDelete, onClick, className }: Props): React.JSX.Element => {
  return (
    <Div key={client._id} className="group relative">
      <Card
        onClick={() => onClick(client)}
        className={cn(
          `hover:shadow-xl hover:shadow-foreground/10 cursor-pointer transition-all duration-300 group-hover:-translate-y-1 ${
            client.isCompany
              ? 'border-ezbill-company/20 hover:border-ezbill-company/40'
              : 'border-ezbill-client/20 hover:border-ezbill-client/40'
          }`,
          className
        )}
      >
        <CardContent className="p-4 sm:p-6">
          {/* Client Avatar */}
          <Div className="w-12 h-12 bg-gradient-client rounded-xl flex items-center justify-center mb-4">
            <Icon
              name={client.isCompany ? 'lucide:Building' : 'lucide:User'}
              className="w-6 h-6 text-white"
            />
          </Div>

          <H3 className="text-base sm:text-lg font-bold text-foreground mb-2 line-clamp-1">
            {client.clientName}
          </H3>
          <P className="text-muted-foreground text-sm mb-1 line-clamp-1">{client.email}</P>
          <P className="text-muted-foreground/80 text-sm line-clamp-1">
            {client.city}, {client.country}
          </P>

          {/* Client Type Badge */}
          <Div className="absolute top-3 right-3">
            <Badge variant={client.isCompany ? 'purple' : 'success'}>
              {client.isCompany ? 'Company' : 'Individual'}
            </Badge>
          </Div>

          {/* Floating Actions */}
          <Div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-card backdrop-blur-sm shadow-lg border-0 min-w-[44px]"
              onClick={e => {
                e.stopPropagation()
                onEdit(client)
              }}
            >
              <Icon name="lucide:Edit" className="w-4 h-4 sm:w-3 sm:h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-background/90 backdrop-blur-sm shadow-lg border-0 text-destructive hover:bg-destructive/10 min-w-[44px]"
              onClick={e => {
                e.stopPropagation()
                onDelete(client)
              }}
            >
              <Icon name="lucide:Trash2" className="w-4 h-4 sm:w-3 sm:h-3" />
            </Button>
          </Div>
        </CardContent>
      </Card>
    </Div>
  )
}

export default ClientCard
