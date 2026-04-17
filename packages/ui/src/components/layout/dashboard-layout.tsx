'use client'

import * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// --- Context ---

interface DashboardContextValue {
  /** Whether the mobile/tablet sidebar overlay is open */
  sidebarOpen: boolean
  /** Toggle the mobile/tablet sidebar overlay */
  setSidebarOpen: (open: boolean) => void
  /** Whether the sidebar is collapsed (icon-only) on desktop */
  collapsed: boolean
  /** Toggle the collapsed state */
  setCollapsed: (collapsed: boolean) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    throw new Error('Dashboard compound components must be used within <DashboardLayout>')
  }
  return ctx
}

// --- DashboardLayout ---

interface DashboardLayoutProps extends React.ComponentProps<'div'> {
  /** Start with sidebar collapsed on desktop */
  defaultCollapsed?: boolean
}

function DashboardLayout({
  className,
  defaultCollapsed = false,
  children,
  ...props
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  // Close overlay sidebar on escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [sidebarOpen])

  return (
    <DashboardContext.Provider value={{ sidebarOpen, setSidebarOpen, collapsed, setCollapsed }}>
      <div
        data-slot="dashboard-layout"
        className={cn('relative flex min-h-screen w-full bg-muted', className)}
        {...props}
      >
        {children}
      </div>
    </DashboardContext.Provider>
  )
}

// --- DashboardSidebar ---

const sidebarVariants = cva(
  'flex flex-col bg-card text-card-foreground border-r transition-all duration-300 ease-in-out',
  {
    variants: {
      variant: {
        default: '',
        inset: 'rounded-r-xl shadow-lg',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

interface DashboardSidebarProps
  extends React.ComponentProps<'aside'>,
    VariantProps<typeof sidebarVariants> {}

function DashboardSidebar({ className, variant, children, ...props }: DashboardSidebarProps) {
  const { sidebarOpen, setSidebarOpen, collapsed } = useDashboard()

  return (
    <>
      {/* Overlay backdrop (mobile/tablet) */}
      {sidebarOpen && (
        <div
          data-slot="dashboard-sidebar-overlay"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile/Tablet: slide-in drawer */}
      <aside
        data-slot="dashboard-sidebar"
        className={cn(
          sidebarVariants({ variant }),
          // Mobile/tablet: fixed overlay drawer
          'fixed inset-y-0 left-0 z-50 w-72',
          'transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static sidebar
          'lg:static lg:translate-x-0 lg:z-auto',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          className
        )}
        {...props}
      >
        {children}
      </aside>
    </>
  )
}

// --- SidebarHeader ---

function SidebarHeader({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 border-b px-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// --- SidebarNav ---

function SidebarNav({ className, children, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="sidebar-nav"
      role="navigation"
      aria-label="Sidebar navigation"
      className={cn('flex-1 overflow-y-auto px-2 py-4', className)}
      {...props}
    >
      <ul className="flex flex-col gap-1" role="list">
        {children}
      </ul>
    </nav>
  )
}

// --- SidebarSection ---

interface SidebarSectionProps extends React.ComponentProps<'div'> {
  /** Optional section label displayed above the group */
  label?: string
}

function SidebarSection({ className, label, children, ...props }: SidebarSectionProps) {
  const { collapsed } = useDashboard()

  return (
    <div
      data-slot="sidebar-section"
      className={cn('mb-2', className)}
      {...props}
    >
      {label && !collapsed && (
        <span className="mb-1 block px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <ul className="flex flex-col gap-1" role="list">
        {children}
      </ul>
    </div>
  )
}

// --- SidebarLink ---

const sidebarLinkVariants = cva(
  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground',
        false: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      },
    },
    defaultVariants: { active: false },
  }
)

interface SidebarLinkProps extends React.ComponentProps<'a'>, VariantProps<typeof sidebarLinkVariants> {
  /** Icon node rendered before the label */
  icon?: React.ReactNode
}

function SidebarLink({ className, active, icon, children, ...props }: SidebarLinkProps) {
  const { collapsed, setSidebarOpen } = useDashboard()

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Close mobile sidebar on navigation
      setSidebarOpen(false)
      props.onClick?.(e)
    },
    [setSidebarOpen, props.onClick]
  )

  return (
    <li role="listitem">
      <a
        data-slot="sidebar-link"
        className={cn(
          sidebarLinkVariants({ active }),
          collapsed && 'lg:justify-center lg:px-0',
          className
        )}
        aria-current={active ? 'page' : undefined}
        {...props}
        onClick={handleClick}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className={cn(collapsed && 'lg:sr-only')}>{children}</span>
      </a>
    </li>
  )
}

// --- SidebarFooter ---

function SidebarFooter({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn(
        'mt-auto shrink-0 border-t px-4 py-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// --- SidebarToggle ---

interface SidebarToggleProps extends React.ComponentProps<'button'> {
  /** Controls which state to toggle: 'mobile' toggles the overlay, 'collapse' toggles desktop collapsed */
  mode?: 'mobile' | 'collapse'
}

function SidebarToggle({ className, mode = 'mobile', ...props }: SidebarToggleProps) {
  const { sidebarOpen, setSidebarOpen, collapsed, setCollapsed } = useDashboard()

  const handleClick = useCallback(() => {
    if (mode === 'mobile') {
      setSidebarOpen(!sidebarOpen)
    } else {
      setCollapsed(!collapsed)
    }
  }, [mode, sidebarOpen, setSidebarOpen, collapsed, setCollapsed])

  const isActive = mode === 'mobile' ? sidebarOpen : !collapsed
  const label = mode === 'mobile'
    ? (sidebarOpen ? 'Close sidebar' : 'Open sidebar')
    : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')

  return (
    <button
      type="button"
      data-slot="sidebar-toggle"
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2',
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      onClick={handleClick}
      aria-label={label}
      aria-expanded={isActive}
      {...props}
    >
      {/* Hamburger / X icon */}
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        {isActive ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  )
}

// --- DashboardMain ---

function DashboardMain({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dashboard-main"
      className={cn('flex flex-1 flex-col min-h-screen min-w-0', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// --- DashboardHeader ---

function DashboardHeader({ className, children, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      data-slot="dashboard-header"
      className={cn(
        'flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4 md:px-6',
        className
      )}
      {...props}
    >
      {children}
    </header>
  )
}

// --- DashboardContent ---

function DashboardContent({ className, children, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="dashboard-content"
      className={cn('flex-1 overflow-y-auto p-4 md:p-6 lg:p-8', className)}
      {...props}
    >
      {children}
    </main>
  )
}

export {
  DashboardLayout,
  DashboardSidebar,
  SidebarHeader,
  SidebarNav,
  SidebarSection,
  SidebarLink,
  SidebarFooter,
  SidebarToggle,
  DashboardMain,
  DashboardHeader,
  DashboardContent,
  useDashboard,
}

export type {
  DashboardLayoutProps,
  DashboardSidebarProps,
  SidebarSectionProps,
  SidebarLinkProps,
  SidebarToggleProps,
}
