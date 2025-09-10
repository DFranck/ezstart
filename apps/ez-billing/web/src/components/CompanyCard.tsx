import { Button, Icon, Card, CardContent } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { Company } from '@ez-billing/types'

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
        <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:Building2" className="w-6 h-6 text-white" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 line-clamp-1">
          {company.companyName}
        </h3>
        <p className="text-muted-foreground text-sm mb-1 line-clamp-1">{company.email}</p>
        <p className="text-muted-foreground/80 text-sm line-clamp-1">
          {company.city}, {company.country}
        </p>

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