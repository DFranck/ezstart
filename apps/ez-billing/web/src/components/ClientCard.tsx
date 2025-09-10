import { Client } from '@ez-billing/types'
import { Button, Card, CardContent, Icon } from '@ezstart/ui/components'
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
        <CardContent className="p-4 sm:p-6">
          {/* Client Avatar */}
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center mb-4">
            <Icon
              name={client.isCompany ? 'lucide:Building' : 'lucide:User'}
              className="w-6 h-6 text-white"
            />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 line-clamp-1">
            {client.clientName}
          </h3>
          <p className="text-muted-foreground text-sm mb-1 line-clamp-1">{client.email}</p>
          <p className="text-muted-foreground/80 text-sm line-clamp-1">
            {client.city}, {client.country}
          </p>

          {/* Client Type Badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                client.isCompany
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
              }`}
            >
              {client.isCompany ? 'Company' : 'Individual'}
            </span>
          </div>

          {/* Floating Actions */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientCard
