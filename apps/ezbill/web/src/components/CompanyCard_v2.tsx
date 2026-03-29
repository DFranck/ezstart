import { Company } from '@ezbill/types'
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  H3,
  Icon,
  Div,
  P,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'

type Props = {
  company: Company
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
  className?: string
}

const CompanyCard = ({ company, onEdit, onDelete, className }: Props): any => {
  return (
    <Div key={company._id} className="group relative">
      <Card
        className={cn(
          'hover:shadow-xl hover:shadow-foreground/10 cursor-pointer transition-all duration-300 border-ezbill-company/20 hover:border-ezbill-company/40 group-hover:-translate-y-1',
          className
        )}
        onClick={() => onEdit(company)}
      >
        <CardHeader className="flex items-center justify-between">
          {/* Company Icon */}
          <Div className="min-w-8 h-8 bg-gradient-company rounded-xl flex items-center justify-center">
            <Icon name="lucide:Building2" className="w-6 h-6 text-white" />
          </Div>
          <H3 size={'h6'} className="text-right">
            {company.companyName}
          </H3>
        </CardHeader>
        <CardContent>
          {company.email && (
            <P className="text-muted-foreground text-sm mb-1 line-clamp-1">
              <Icon name="lucide:Mail" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
              {company.email}
            </P>
          )}
          {company.phone && (
            <P className="text-muted-foreground text-sm mb-1 line-clamp-1">
              <Icon name="lucide:Phone" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
              {company.phone}
            </P>
          )}
          {(company.city || company.country || company.address) && (
            <P className="text-muted-foreground/80 text-sm line-clamp-2">
              <Icon name="lucide:MapPin" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
              {[company.address, company.city, company.country].filter(Boolean).join(', ')}
            </P>
          )}
          {company.website && (
            <P className="text-muted-foreground text-sm mb-1 line-clamp-1">
              <Icon name="lucide:Globe" className="w-4 h-4 sm:w-3 sm:h-3 inline mr-1" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="hover:text-primary transition-colors"
              >
                {company.website.replace(/^https?:\/\//, '')}
              </a>
            </P>
          )}
          {company.taxNumber && (
            <P className="text-muted-foreground/60 text-xs mt-2">Tax: {company.taxNumber}</P>
          )}
        </CardContent>
        {/* Floating Actions */}
        <CardFooter className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="bg-background/90 backdrop-blur-sm shadow-lg border-0"
            onClick={e => {
              e.stopPropagation()
              onEdit(company)
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
              onDelete(company)
            }}
          >
            <Icon name="lucide:Trash2" className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>
        </CardFooter>
      </Card>
    </Div>
  )
}

export default CompanyCard
