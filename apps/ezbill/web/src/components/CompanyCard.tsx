import { Company } from '@ezbill/types'
import { Button, Card, CardContent, Icon } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'

type Props = {
  company: Company
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
  className?: string
}

const CompanyCard = ({ company, onEdit, onDelete, className }: Props) => {
  return (
    <div key={company._id} className="group relative">
      <Card
        className={cn(
          'hover:shadow-xl cursor-pointer transition-all duration-300 hover:border-indigo-200 group-hover:-translate-y-1',
          className
        )}
        onClick={() => onEdit(company)}
      >
        <CardContent className="p-4 sm:p-6">
          {/* Company Icon */}
          <div className="w-12 h-12 bg-gradient-to-r from-ezbill-indigo-400 to-ezbill-purple-400 rounded-xl flex items-center justify-center mb-4">
            <Icon name="lucide:Building2" className="w-6 h-6 text-white" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 line-clamp-1">
            {company.companyName}
          </h3>
          {company.email && (
            <p className="text-muted-foreground text-sm mb-1 line-clamp-1">
              <Icon name="lucide:Mail" className="w-3 h-3 inline mr-1" />
              {company.email}
            </p>
          )}
          {company.phone && (
            <p className="text-muted-foreground text-sm mb-1 line-clamp-1">
              <Icon name="lucide:Phone" className="w-3 h-3 inline mr-1" />
              {company.phone}
            </p>
          )}
          {(company.city || company.country || company.address) && (
            <p className="text-muted-foreground/80 text-sm line-clamp-2">
              <Icon name="lucide:MapPin" className="w-3 h-3 inline mr-1" />
              {[company.address, company.city, company.country].filter(Boolean).join(', ')}
            </p>
          )}
          {company.website && (
            <p className="text-muted-foreground text-sm mb-1 line-clamp-1">
              <Icon name="lucide:Globe" className="w-3 h-3 inline mr-1" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="hover:text-primary transition-colors"
              >
                {company.website.replace(/^https?:\/\//, '')}
              </a>
            </p>
          )}
          {company.taxNumber && (
            <p className="text-muted-foreground/60 text-xs mt-2">Tax: {company.taxNumber}</p>
          )}

          {/* Floating Actions */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-background/90 backdrop-blur-sm shadow-lg border-0"
              onClick={e => {
                e.stopPropagation()
                onEdit(company)
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
                onDelete(company)
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

export default CompanyCard
