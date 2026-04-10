'use client'

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table as TanstackTable,
  type Header,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'
import { Button } from '../button'
import { Input } from '../forms/input'
import { cn } from '../../lib/utils'
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext'

// ─── DataTable Column Header ─────────────────────────────────────────────────

interface DataTableColumnHeaderProps<TData, TValue> {
  header: Header<TData, TValue>
  title: string
  className?: string
}

function DataTableColumnHeader<TData, TValue>({
  header,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!header.column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  const sorted = header.column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-3 h-8 data-[state=open]:bg-accent', className)}
      onClick={() => header.column.toggleSorting()}
    >
      {title}
      {sorted === 'desc' ? (
        <ChevronDownIcon className="ml-2 size-4" />
      ) : sorted === 'asc' ? (
        <ChevronUpIcon className="ml-2 size-4" />
      ) : (
        <ChevronsUpDownIcon className="ml-2 size-4" />
      )}
    </Button>
  )
}

// ─── DataTable Pagination ────────────────────────────────────────────────────

interface DataTablePaginationProps<TData> {
  table: TanstackTable<TData>
}

function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        {table.getFilteredRowModel().rows.length} row(s)
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

// ─── DataTable ───────────────────────────────────────────────────────────────

interface DataTableProps<TData, TValue> {
  /** Column definitions (tanstack ColumnDef) */
  columns: ColumnDef<TData, TValue>[]
  /** Row data */
  data: TData[]
  /** Column ID to enable text filtering on */
  filterColumn?: string
  /** Placeholder for the filter input */
  filterPlaceholder?: string
  /** Number of rows per page (default: 10) */
  pageSize?: number
  /** Hide pagination controls */
  hidePagination?: boolean
  /** Initial sorting state */
  initialSorting?: SortingState
  /** Additional class for the wrapper */
  className?: string
  /** @deprecated Use `density` instead. tableSize will be removed in a future version. */
  tableSize?: 'compact' | 'default' | 'comfortable'
  /** Density token — controls spacing. Inherits from parent DesignTokenProvider. */
  density?: 'compact' | 'default' | 'comfortable'
  /** Max height for scrollable table body (e.g. '300px') */
  maxHeight?: string
  /** Make the header sticky when scrolling (requires maxHeight) */
  stickyHeader?: boolean
}

function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterPlaceholder = 'Filter...',
  pageSize = 10,
  hidePagination = false,
  initialSorting,
  className,
  tableSize,
  density,
  maxHeight,
  stickyHeader,
}: DataTableProps<TData, TValue>) {
  const inherited = useDesignTokens()
  // density wins over tableSize; inherited context is fallback
  const resolvedDensity = density ?? tableSize ?? inherited.density ?? 'default'
  // Map 'relaxed' (standard token value) to 'comfortable' (DataTable-specific)
  const mappedDensity = resolvedDensity === 'relaxed' ? 'comfortable' : resolvedDensity

  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  })

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter input */}
      {filterColumn && (
        <Input
          placeholder={filterPlaceholder}
          value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ''}
          onChange={e => table.getColumn(filterColumn)?.setFilterValue(e.target.value)}
          className="max-w-sm"
        />
      )}

      {/* Table — separate X and Y scroll so horizontal scrollbar is always visible */}
      <div className={cn('rounded-md border', maxHeight ? 'overflow-x-auto' : 'overflow-auto')}>
        <div
          className={maxHeight ? 'overflow-y-auto [&>div]:overflow-visible' : undefined}
          style={maxHeight ? { maxHeight } : undefined}
        >
        <Table size={mappedDensity as 'compact' | 'default' | 'comfortable'}>
          <TableHeader className={stickyHeader ? 'sticky top-0 z-10 bg-background' : undefined}>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() &&
                      typeof header.column.columnDef.header === 'string' ? (
                      <DataTableColumnHeader
                        header={header}
                        title={header.column.columnDef.header}
                      />
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Pagination */}
      {!hidePagination && <DataTablePagination table={table} />}
    </div>
  )
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { DataTable, DataTableColumnHeader, DataTablePagination }
export type { DataTableProps, DataTableColumnHeaderProps, DataTablePaginationProps }

// Re-export useful tanstack types for consumers
export { type ColumnDef, type SortingState, type ColumnFiltersState } from '@tanstack/react-table'
