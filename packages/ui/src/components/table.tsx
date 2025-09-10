import { ComponentProps, forwardRef } from 'react'

export const Table = forwardRef<HTMLTableElement, ComponentProps<'table'>>(
  ({ className, ...props }, ref) => (
    <table
      ref={ref}
      className={`min-w-full divide-y divide-gray-200 ${className || ''}`}
      {...props}
    />
  )
)
Table.displayName = 'Table'

export const TableHeader = forwardRef<HTMLTableSectionElement, ComponentProps<'thead'>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={`bg-gray-50 ${className || ''}`} {...props} />
  )
)
TableHeader.displayName = 'TableHeader'

export const TableBody = forwardRef<HTMLTableSectionElement, ComponentProps<'tbody'>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={`bg-white divide-y divide-gray-200 ${className || ''}`}
      {...props}
    />
  )
)
TableBody.displayName = 'TableBody'

export const TableRow = forwardRef<HTMLTableRowElement, ComponentProps<'tr'>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={`hover:bg-gray-50 ${className || ''}`} {...props} />
  )
)
TableRow.displayName = 'TableRow'

export const TableHead = forwardRef<HTMLTableCellElement, ComponentProps<'th'>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className || ''}`}
      {...props}
    />
  )
)
TableHead.displayName = 'TableHead'

export const TableCell = forwardRef<HTMLTableCellElement, ComponentProps<'td'>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${className || ''}`}
      {...props}
    />
  )
)
TableCell.displayName = 'TableCell'
