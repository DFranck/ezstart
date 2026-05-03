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
import { useEffect, useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from 'lucide-react'
import { warnDeprecation } from '@ezstart/logger'
import { toast } from 'sonner'
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

interface DataTablePaginationTexts {
  /** Format string for the row counter. Use `{count}` placeholder. */
  rows?: string
  previous?: string
  next?: string
  /** Format string for the "Page X of Y" indicator. Use `{current}` and `{total}`. */
  pageOf?: string
}

interface DataTablePaginationProps<TData> {
  table: TanstackTable<TData>
  texts?: DataTablePaginationTexts
}

const DEFAULT_PAGINATION_TEXTS: Required<DataTablePaginationTexts> = {
  rows: '{count} row(s)',
  previous: 'Previous',
  next: 'Next',
  pageOf: 'Page {current} of {total}',
}

function DataTablePagination<TData>({ table, texts }: DataTablePaginationProps<TData>) {
  // Per-key nullish-coalesce — guards against consumers that pass an explicit
  // `texts` object with undefined keys (e.g. `texts={{ rows: t?.row }}`). A
  // plain spread `{ ...DEFAULTS, ...texts }` would let `undefined` overwrite
  // the defaults and crash `.replace()` at render time.
  const t = {
    rows: texts?.rows ?? DEFAULT_PAGINATION_TEXTS.rows,
    previous: texts?.previous ?? DEFAULT_PAGINATION_TEXTS.previous,
    next: texts?.next ?? DEFAULT_PAGINATION_TEXTS.next,
    pageOf: texts?.pageOf ?? DEFAULT_PAGINATION_TEXTS.pageOf,
  }
  const rowCount = table.getFilteredRowModel().rows.length
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        {t.rows.replace('{count}', String(rowCount))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {t.previous}
        </Button>
        <div className="text-sm text-muted-foreground">
          {t.pageOf
            .replace('{current}', String(currentPage))
            .replace('{total}', String(totalPages))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {t.next}
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
  /**
   * Sticky-column responsive strategy. When enabled, the first and last
   * columns stay pinned while the middle columns scroll horizontally.
   * Combined with the existing `overflow-x-auto` wrapper this keeps the
   * primary identifier (email/name/slug) and the row actions always
   * visible on narrow viewports — admin DataTables otherwise clip the
   * Email + Actions columns under `lg` (1024px) breakpoints.
   *
   * - `'none'` (default) — no sticky columns, identical to legacy behaviour.
   * - `'lg-down'` — sticky below `lg` breakpoint only (recommended for
   *   admin tables that already fit fine on desktop).
   * - `'always'` — sticky on every viewport (data-dense tables).
   */
  stickyColumns?: 'none' | 'lg-down' | 'always'
  /** Translatable strings for pagination + empty state. Defaults are English. */
  texts?: DataTablePaginationTexts & { empty?: string }
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
  stickyColumns = 'none',
  texts,
}: DataTableProps<TData, TValue>) {
  const inherited = useDesignTokens()
  // Surface deprecation warning when consumer uses the legacy `tableSize` prop.
  useEffect(() => {
    if (tableSize !== undefined) {
      warnDeprecation('DataTable.tableSize', 'density prop', {
        toast: msg => toast.warning(msg),
      })
    }
  }, [tableSize])
  // density wins over tableSize; inherited context is fallback
  const resolvedDensity = density ?? tableSize ?? inherited.density ?? 'default'
  // Map 'relaxed' (standard token value) to 'comfortable' (DataTable-specific)
  const mappedDensity = resolvedDensity === 'relaxed' ? 'comfortable' : resolvedDensity

  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // ─── Sticky-column helpers ───────────────────────────────────────────────
  // Strategy: position: sticky on the first and last column. Each sticky
  // cell needs its own opaque background (row background doesn't propagate
  // to sticky cells), plus a subtle shadow that indicates the column floats
  // above the horizontally-scrolling middle content. Body cells default to
  // `bg-card`; header cells inherit `bg-muted` to match `<TableHeader>`.
  // The `lg-down` variant only activates the sticky behaviour below the lg
  // breakpoint (1024px) — desktop layouts keep the legacy flat table.
  const stickyEnabled = stickyColumns !== 'none'
  const stickyPrefix = stickyColumns === 'lg-down' ? 'lg:static lg:shadow-none ' : ''
  const stickyLeftClass = stickyEnabled
    ? `${stickyPrefix}sticky left-0 z-10 bg-card shadow-[1px_0_0_0_var(--border)]`
    : ''
  const stickyRightClass = stickyEnabled
    ? `${stickyPrefix}sticky right-0 z-10 bg-card shadow-[-1px_0_0_0_var(--border)]`
    : ''
  const stickyHeadLeftClass = stickyEnabled
    ? `${stickyPrefix}sticky left-0 z-20 bg-muted shadow-[1px_0_0_0_var(--border)]`
    : ''
  const stickyHeadRightClass = stickyEnabled
    ? `${stickyPrefix}sticky right-0 z-20 bg-muted shadow-[-1px_0_0_0_var(--border)]`
    : ''

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
              {table.getHeaderGroups().map(headerGroup => {
                const lastIdx = headerGroup.headers.length - 1
                return (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header, idx) => {
                      const stickyClass =
                        idx === 0
                          ? stickyHeadLeftClass
                          : idx === lastIdx
                            ? stickyHeadRightClass
                            : ''
                      return (
                        <TableHead key={header.id} className={stickyClass || undefined}>
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
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => {
                  const cells = row.getVisibleCells()
                  const lastIdx = cells.length - 1
                  return (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {cells.map((cell, idx) => {
                        const stickyClass =
                          idx === 0 ? stickyLeftClass : idx === lastIdx ? stickyRightClass : ''
                        return (
                          <TableCell key={cell.id} className={stickyClass || undefined}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {texts?.empty ?? 'No results.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {!hidePagination && <DataTablePagination table={table} texts={texts} />}
    </div>
  )
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { DataTable, DataTableColumnHeader, DataTablePagination }
export type {
  DataTableProps,
  DataTableColumnHeaderProps,
  DataTablePaginationProps,
  DataTablePaginationTexts,
}

// Re-export useful tanstack types for consumers
export { type ColumnDef, type SortingState, type ColumnFiltersState } from '@tanstack/react-table'
