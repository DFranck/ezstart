import { PaymentMethod } from '@ezbill/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Icon,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'

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
        <CardHeader className="flex items-center justify-between">
          <div className="w-8 h-8 bg-gradient-payment rounded-xl flex items-center justify-center">
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
          {paymentMethod.isDefault && (
            <Badge variant="success" size="sm">
              Default
            </Badge>
          )}
        </CardHeader>
        <CardContent className="">
          <p className="text-muted-foreground text-sm mb-2 capitalize">
            <Icon name="lucide:Info" className="w-3 h-3 inline mr-1" />
            {paymentMethod.type.replace(/_/g, ' ')}
          </p>

          {paymentMethod.type === 'crypto_wallet' && (
            <>
              <p className="text-muted-foreground text-sm mb-1">
                <Icon name="lucide:Coins" className="w-3 h-3 inline mr-1" />
                {paymentMethod.currency} • {paymentMethod.network}
              </p>
              {paymentMethod.walletAddress && (
                <p className="text-muted-foreground/80 text-xs line-clamp-1 font-mono break-all">
                  <Icon name="lucide:Hash" className="w-3 h-3 inline mr-1" />
                  {paymentMethod.walletAddress}
                </p>
              )}
            </>
          )}

          {paymentMethod.type === 'bank_transfer' && (
            <>
              {paymentMethod.bankName && (
                <p className="text-muted-foreground text-sm mb-1">
                  <Icon name="lucide:Building2" className="w-3 h-3 inline mr-1" />
                  {paymentMethod.bankName}
                </p>
              )}
              {paymentMethod.accountNumber && (
                <p className="text-muted-foreground/80 text-sm mb-1">
                  <Icon name="lucide:CreditCard" className="w-3 h-3 inline mr-1" />
                  Account: {paymentMethod.accountNumber}
                </p>
              )}
              {paymentMethod.iban && (
                <p className="text-muted-foreground/80 text-sm mb-1 font-mono text-xs">
                  IBAN: {paymentMethod.iban}
                </p>
              )}
              {paymentMethod.swift && (
                <p className="text-muted-foreground/80 text-sm mb-1">
                  SWIFT: {paymentMethod.swift}
                </p>
              )}
            </>
          )}

          {['paypal', 'wise', 'revolut'].includes(paymentMethod.type) && (
            <>
              {paymentMethod.email && (
                <p className="text-muted-foreground text-sm mb-1">
                  <Icon name="lucide:Mail" className="w-3 h-3 inline mr-1" />
                  {paymentMethod.email}
                </p>
              )}
              {paymentMethod.username && (
                <p className="text-muted-foreground/80 text-sm">
                  <Icon name="lucide:User" className="w-3 h-3 inline mr-1" />@
                  {paymentMethod.username}
                </p>
              )}
            </>
          )}

          {paymentMethod.instructions && (
            <p className="text-muted-foreground/60 text-xs mt-2 italic line-clamp-2">
              <Icon name="lucide:MessageCircle" className="w-3 h-3 inline mr-1" />
              {paymentMethod.instructions}
            </p>
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
        </CardFooter>
      </Card>
    </div>
  )
}

export default PaymentMethodCard
