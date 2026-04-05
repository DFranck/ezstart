import { ComponentProps, forwardRef } from 'react'
import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { tableVariantConfig } from '../../lib/design-system/variants'

/**
 * Table Component - Enhanced with Variants & Sorting
 *
 * Accessible table with multiple variants, sizes, and sortable headers.
 *
 * @example
 * // Basic table
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *       <TableHead>Status</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>John Doe</TableCell>
 *       <TableCell>Active</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 *
 * @example
 * // With variants and sortable
 * <Table variant="striped" size="compact">
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead sortable sortDirection="asc" onSort={() => handleSort('name')}>
 *         Name
 *       </TableHead>
 *       <TableHead sortable onSort={() => handleSort('email')}>
 *         Email
 *       </TableHead>
 *     </TableRow>
 *   </TableHeader>
 * </Table>
 */

const tableVariants = cva('w-full caption-bottom text-base sm:text-sm', {
  variants: tableVariantConfig,
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export interface TableProps
  extends ComponentProps<'table'>,
    VariantProps<typeof tableVariants> {}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn(tableVariants({ variant, size }), className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = 'Table'

export const TableHeader = forwardRef<HTMLTableSectionElement, ComponentProps<'thead'>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('bg-muted/50', className)} {...props} />
  )
)
TableHeader.displayName = 'TableHeader'

export const TableBody = forwardRef<HTMLTableSectionElement, ComponentProps<'tbody'>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
)
TableBody.displayName = 'TableBody'

export interface TableRowProps extends ComponentProps<'tr'> {
  /** Highlight row (e.g., selected state) */
  highlighted?: boolean
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, highlighted, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-border transition-colors',
        highlighted && 'bg-muted',
        className
      )}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

export interface TableHeadProps extends ComponentProps<'th'> {
  /** Make column sortable */
  sortable?: boolean
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc' | null
  /** Callback when sort changes */
  onSort?: () => void
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sortDirection, onSort, children, ...props }, ref) => {
    const content = (
      <>
        {children}
        {sortable && (
          <span className="ml-2 inline-flex">
            {sortDirection === 'asc' ? (
              <ChevronUpIcon className="size-4" />
            ) : sortDirection === 'desc' ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronsUpDownIcon className="size-4 opacity-50" />
            )}
          </span>
        )}
      </>
    )

    return (
      <th
        ref={ref}
        className={cn(
          'text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
          sortable && 'cursor-pointer select-none hover:text-foreground',
          className
        )}
        onClick={sortable ? onSort : undefined}
        role={sortable ? 'button' : undefined}
        tabIndex={sortable ? 0 : undefined}
        onKeyDown={
          sortable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSort?.()
                }
              }
            : undefined
        }
        {...props}
      >
        {content}
      </th>
    )
  }
)
TableHead.displayName = 'TableHead'

export const TableCell = forwardRef<HTMLTableCellElement, ComponentProps<'td'>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('align-middle [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  )
)
TableCell.displayName = 'TableCell'

export const TableCaption = forwardRef<HTMLTableCaptionElement, ComponentProps<'caption'>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
  )
)
TableCaption.displayName = 'TableCaption'

export const TableFooter = forwardRef<HTMLTableSectionElement, ComponentProps<'tfoot'>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
)
TableFooter.displayName = 'TableFooter'
