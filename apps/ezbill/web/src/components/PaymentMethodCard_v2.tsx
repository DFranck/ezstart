import { PaymentMethod } from '@ezbill/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Icon,
  Div,
  P,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'

type Props = {
  paymentMethod: PaymentMethod
  onEdit: (paymentMethod: PaymentMethod) => void
  onDelete: (paymentMethod: PaymentMethod) => void
  className?: string
}

const PaymentMethodCard = ({
  paymentMethod,
  onEdit,
  onDelete,
  className,
}: Props): React.JSX.Element => {
  return (
    <Div key={paymentMethod._id} className="group relative">
      <Card
        className={cn(
          'hover:shadow-xl hover:shadow-foreground/10 cursor-pointer transition-all duration-300 border-ezbill-payment/20 hover:border-ezbill-payment/40 group-hover:-translate-y-1',
          className
        )}
        onClick={() => onEdit(paymentMethod)}
      >
        <CardHeader className="flex items-center justify-between">
          <Div className="w-8 h-8 bg-gradient-payment rounded-xl flex items-center justify-center">
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
          </Div>
          {paymentMethod.isDefault && (
            <Badge variant="success" size="sm">
              Default
            </Badge>
          )}
        </CardHeader>
        <CardContent className="">
          <P className="text-muted-foreground text-sm mb-2 capitalize">
            <Icon name="lucide:Info" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
            {paymentMethod.type.replace(/_/g, ' ')}
          </P>

          {paymentMethod.type === 'crypto_wallet' && (
            <>
              <P className="text-muted-foreground text-sm mb-1">
                <Icon name="lucide:Coins" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
                {paymentMethod.currency} • {paymentMethod.network}
              </P>
              {paymentMethod.walletAddress && (
                <P className="text-muted-foreground/80 text-xs line-clamp-1 font-mono break-all">
                  <Icon name="lucide:Hash" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
                  {paymentMethod.walletAddress}
                </P>
              )}
            </>
          )}

          {paymentMethod.type === 'bank_transfer' && (
            <>
              {paymentMethod.bankName && (
                <P className="text-muted-foreground text-sm mb-1">
                  <Icon name="lucide:Building2" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
                  {paymentMethod.bankName}
                </P>
              )}
              {paymentMethod.accountNumber && (
                <P className="text-muted-foreground/80 text-sm mb-1">
                  <Icon name="lucide:CreditCard" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
                  Account: {paymentMethod.accountNumber}
                </P>
              )}
              {paymentMethod.iban && (
                <P className="text-muted-foreground/80 text-sm mb-1 font-mono text-xs">
                  IBAN: {paymentMethod.iban}
                </P>
              )}
              {paymentMethod.swift && (
                <P className="text-muted-foreground/80 text-sm mb-1">
                  SWIFT: {paymentMethod.swift}
                </P>
              )}
            </>
          )}

          {paymentMethod.type === 'cash' && (
            <P className="text-muted-foreground text-sm">
              <Icon name="lucide:Banknote" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
              Cash payment
            </P>
          )}

          {paymentMethod.instructions && (
            <P className="text-muted-foreground/60 text-xs mt-2 italic line-clamp-2">
              <Icon name="lucide:MessageCircle" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
              {paymentMethod.instructions}
            </P>
          )}
        </CardContent>
        {/* Floating Actions */}
        <CardFooter className="flex items-center justify-end gap-2">
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
        </CardFooter>
      </Card>
    </Div>
  )
}

export default PaymentMethodCard
