import { Button, Icon, Card, CardContent, Div, H3, P, Span } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { PaymentMethod } from '@ezbill/types'

type Props = {
  paymentMethod: PaymentMethod
  onEdit: (paymentMethod: PaymentMethod) => void
  onDelete: (paymentMethod: PaymentMethod) => void
  className?: string
}

const PaymentMethodCard = ({ paymentMethod, onEdit, onDelete, className }: Props): any => {
  return (
    <Div key={paymentMethod._id} className="group relative">
      <Card
        className={cn(
          'hover:shadow-xl hover:shadow-foreground/10 cursor-pointer transition-all duration-300 border-ezbill-payment/20 hover:border-ezbill-payment/40 group-hover:-translate-y-1',
          className
        )}
        onClick={() => onEdit(paymentMethod)}
      >
        <CardContent className="p-4 sm:p-6">
          {/* Payment Method Icon */}
          <Div className="w-12 h-12 bg-gradient-payment rounded-xl flex items-center justify-center mb-4">
            <Icon
              name={
                paymentMethod.type === 'crypto_wallet'
                  ? 'lucide:Wallet'
                  : paymentMethod.type === 'bank_transfer'
                    ? 'lucide:Building'
                    : 'lucide:CreditCard'
              }
              className="w-6 h-6 text-ezbill-payment-foreground"
            />
          </Div>

          <Div className="flex items-center space-x-2 mb-2">
            <H3 className="text-lg font-bold text-foreground line-clamp-1">{paymentMethod.name}</H3>
            {paymentMethod.isDefault && (
              <Span className="bg-ezbill-payment/10 text-ezbill-payment border border-ezbill-payment/30 text-xs px-2 py-1 rounded-full font-medium">
                Default
              </Span>
            )}
          </Div>

          <P className="text-muted-foreground text-sm mb-1 capitalize">
            {paymentMethod.type.replace('_', ' ')}
          </P>

          {paymentMethod.type === 'crypto_wallet' && (
            <P className="text-muted-foreground/80 text-sm line-clamp-1 font-mono">
              {paymentMethod.currency} • {paymentMethod.network}
            </P>
          )}

          {paymentMethod.type === 'bank_transfer' && (
            <P className="text-muted-foreground/80 text-sm line-clamp-1">
              {paymentMethod.bankName} • {paymentMethod.iban}
            </P>
          )}

          {paymentMethod.type === 'cash' && (
            <P className="text-muted-foreground/80 text-sm line-clamp-1">Cash payment</P>
          )}

          {/* Floating Actions */}
          <Div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-background/90 backdrop-blur-sm shadow-lg border-0"
              onClick={e => {
                e.stopPropagation()
                onEdit(paymentMethod)
              }}
            >
              <Icon name="lucide:Edit" className="w-5 h-5 sm:w-4 sm:h-4" />
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
              <Icon name="lucide:Trash2" className="w-5 h-5 sm:w-4 sm:h-4" />
            </Button>
          </Div>
        </CardContent>
      </Card>
    </Div>
  )
}

export default PaymentMethodCard
