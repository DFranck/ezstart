import { Button, Icon, Card, CardContent } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { PaymentMethod } from '@ez-billing/types'

type Props = {
  paymentMethod: PaymentMethod
  onEdit: (paymentMethod: PaymentMethod) => void
  onDelete: (paymentMethod: PaymentMethod) => void
  className?: string
}

const PaymentMethodCard = ({ paymentMethod, onEdit, onDelete, className }: Props) => {
  return (
    <div key={paymentMethod._id} className="group relative">
      <Card
        className={cn(
          'hover:shadow-xl cursor-pointer transition-all duration-300 hover:border-green-200 group-hover:-translate-y-1',
          className
        )}
        onClick={() => onEdit(paymentMethod)}
      >
        <CardContent className="p-4 sm:p-6">
        {/* Payment Method Icon */}
        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center mb-4">
          <Icon
            name={
              paymentMethod.type === 'crypto_wallet'
                ? 'lucide:Wallet'
                : paymentMethod.type === 'bank_transfer'
                  ? 'lucide:Building'
                  : 'lucide:CreditCard'
            }
            className="w-6 h-6 text-white"
          />
        </div>

        <div className="flex items-center space-x-2 mb-2">
          <h3 className="text-lg font-bold text-foreground line-clamp-1">
            {paymentMethod.name}
          </h3>
          {paymentMethod.isDefault && (
            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
              Default
            </span>
          )}
        </div>

        <p className="text-muted-foreground text-sm mb-1 capitalize">
          {paymentMethod.type.replace('_', ' ')}
        </p>

        {paymentMethod.type === 'crypto_wallet' && (
          <p className="text-muted-foreground/80 text-sm line-clamp-1 font-mono">
            {paymentMethod.currency} • {paymentMethod.network}
          </p>
        )}

        {paymentMethod.type === 'bank_transfer' && (
          <p className="text-muted-foreground/80 text-sm line-clamp-1">
            {paymentMethod.bankName}
          </p>
        )}

        {['paypal', 'wise', 'revolut'].includes(paymentMethod.type) && (
          <p className="text-muted-foreground/80 text-sm line-clamp-1">{paymentMethod.email}</p>
        )}

        {/* Floating Actions */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-background/90 backdrop-blur-sm shadow-lg border-0"
            onClick={e => {
              e.stopPropagation()
              onEdit(paymentMethod)
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
              onDelete(paymentMethod)
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

export default PaymentMethodCard