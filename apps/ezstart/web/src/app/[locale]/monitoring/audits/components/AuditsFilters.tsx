'use client'

import {
  Badge,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Div,
  P,
  Select,
  Span,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useState, useMemo } from 'react'

export type DomainFilter =
  | 'all'
  | 'backend'
  | 'frontend'
  | 'infrastructure'
  | 'architecture'
  | 'content'
  | 'integrations'

interface Audit {
  auditType: string
  name: string
  emoji: string
  description: string
  score: number | null
  status: 'complete' | 'partial' | 'not-audited'
  audited?: string[]
  notAudited?: string[]
  why?: string
  nextSteps?: string[]
}

interface AuditsFiltersProps {
  audits: Audit[]
  onFilterChange?: (filters: {
    domain: DomainFilter
    search: string
    selectedAudit: string | null
  }) => void
  children: (filteredAudits: Audit[]) => React.ReactNode
}

const DOMAIN_TABS = [
  { key: 'all', label: 'All', emoji: '📊' },
  { key: 'backend', label: 'Backend', emoji: '⚙️' },
  { key: 'frontend', label: 'Frontend', emoji: '🎨' },
  { key: 'infrastructure', label: 'Infra', emoji: '🔧' },
  { key: 'architecture', label: 'Archi', emoji: '🏗️' },
  { key: 'content', label: 'Content', emoji: '📝' },
  { key: 'integrations', label: 'Integrations', emoji: '🔌' },
] as const

export function AuditsFilters({ audits, children }: AuditsFiltersProps) {
  const [activeDomain, setActiveDomain] = useState<DomainFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAuditType, setSelectedAuditType] = useState<string | null>(null)

  // Memoize filtered audits to prevent infinite loops
  const filteredAudits = useMemo(() => {
    // Filter by domain
    const domainFilteredAudits =
      activeDomain === 'all'
        ? audits
        : audits.filter(audit => {
            // Map audit types to domains based on audits.json structure
            const auditTypeToDomain: Record<string, DomainFilter> = {
              api: 'backend',
              databases: 'backend',
              security: 'backend',
              ux: 'frontend',
              mobileUx: 'frontend',
              accessibility: 'frontend',
              webApps: 'frontend',
              infrastructure: 'infrastructure',
              monitoring: 'infrastructure',
              dependencies: 'infrastructure',
              architecture: 'architecture',
              codeQuality: 'architecture',
              testing: 'architecture',
              documentation: 'content',
              seo: 'content',
              i18n: 'content',
              integrations: 'integrations',
              performance: 'integrations',
            }
            return auditTypeToDomain[audit.auditType] === activeDomain
          })

    // Filter by search query
    const searchFilteredAudits = searchQuery
      ? domainFilteredAudits.filter(
          audit =>
            audit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            audit.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : domainFilteredAudits

    // Filter by selected audit (if any)
    return selectedAuditType
      ? searchFilteredAudits.filter(audit => audit.auditType === selectedAuditType)
      : searchFilteredAudits
  }, [audits, activeDomain, searchQuery, selectedAuditType])

  // Group by score
  const perfect = filteredAudits.filter(a => a.score === 100)
  const excellent = filteredAudits.filter(a => a.score !== null && a.score >= 90 && a.score < 100)
  const good = filteredAudits.filter(a => a.score !== null && a.score >= 80 && a.score < 90)
  const needsWork = filteredAudits.filter(a => a.score !== null && a.score < 80)

  // Count by domain
  const getDomainCount = (domain: DomainFilter) => {
    if (domain === 'all') return audits.length
    return audits.filter(audit => {
      const auditTypeToDomain: Record<string, DomainFilter> = {
        api: 'backend',
        databases: 'backend',
        security: 'backend',
        ux: 'frontend',
        mobileUx: 'frontend',
        accessibility: 'frontend',
        webApps: 'frontend',
        infrastructure: 'infrastructure',
        monitoring: 'infrastructure',
        dependencies: 'infrastructure',
        architecture: 'architecture',
        codeQuality: 'architecture',
        testing: 'architecture',
        documentation: 'content',
        seo: 'content',
        i18n: 'content',
        integrations: 'integrations',
        performance: 'integrations',
      }
      return auditTypeToDomain[audit.auditType] === domain
    }).length
  }

  const handleDomainChange = (domain: DomainFilter) => {
    setActiveDomain(domain)
    setSearchQuery('') // Reset search when changing domain
    setSelectedAuditType(null) // Reset selected audit
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSelectedAuditType(null) // Reset selected audit when searching
  }

  const handleAuditSelect = (auditType: string) => {
    // Toggle: if already selected, deselect it (return to full view)
    setSelectedAuditType(prev => (prev === auditType ? null : auditType))
  }

  return (
    <Div layout="col" className="w-full max-w-4xl gap-2">
      {/* Domain Filter - Mobile: Select, Desktop: Tabs */}
      <Div className="space-y-2 sm:space-y-3">
        <P className="text-xs sm:text-sm font-medium text-muted-foreground px-1">
          Filter by Domain
        </P>

        {/* Mobile: Dropdown */}
        <Div className="lg:hidden">
          <Select
            value={activeDomain}
            onValueChange={value => handleDomainChange(value as DomainFilter)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOMAIN_TABS.map(tab => {
                const count = getDomainCount(tab.key as DomainFilter)
                return (
                  <SelectItem key={tab.key} value={tab.key}>
                    <Div className="flex items-center gap-2 w-full">
                      <Span>{tab.emoji}</Span>
                      <Span className="flex-1">{tab.label}</Span>
                      <Span className="text-xs text-muted-foreground">({count})</Span>
                    </Div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </Div>

        {/* Desktop: Tabs */}
        <Div className="hidden lg:block">
          <Tabs
            value={activeDomain}
            onValueChange={value => handleDomainChange(value as DomainFilter)}
          >
            <TabsList>
              {DOMAIN_TABS.map(tab => {
                const count = getDomainCount(tab.key as DomainFilter)
                return (
                  <TabsTrigger key={tab.key} value={tab.key}>
                    <Span>{tab.emoji}</Span>
                    <Span>{tab.label}</Span>
                    <Span className="ml-1 text-xs text-muted-foreground">({count})</Span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </Div>
      </Div>

      {/* Command Search + Score Groups */}
      <Command className="rounded-lg border shadow-md">
        <CommandInput
          placeholder="Search audits..."
          value={searchQuery}
          onValueChange={handleSearchChange}
        />
        <CommandList>
          <CommandEmpty>No audits found.</CommandEmpty>

          {/* Perfect Score (100/100) */}
          {perfect.length > 0 && (
            <>
              <CommandGroup
                heading={`✅ Perfect (100/100) - ${perfect.length}`}
                headingVariant="healthy"
              >
                {perfect.map(audit => (
                  <CommandItem
                    key={audit.auditType}
                    onSelect={() => handleAuditSelect(audit.auditType)}
                    className={`cursor-pointer ${
                      selectedAuditType === audit.auditType
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : ''
                    }`}
                  >
                    <Span className="flex-shrink-0">{audit.emoji}</Span>
                    <Span className="flex-1 text-sm truncate">{audit.name}</Span>
                    <Badge className="bg-status-healthy/10 text-status-healthy border-status-healthy/20 px-1.5 py-0.5 text-[10px] leading-none flex-shrink-0">
                      {audit.score}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
              {excellent.length > 0 && <CommandSeparator />}
            </>
          )}

          {/* Excellent (90-99) */}
          {excellent.length > 0 && (
            <>
              <CommandGroup
                heading={`🌟 Excellent (90-99) - ${excellent.length}`}
                headingVariant="healthy-light"
              >
                {excellent.map(audit => (
                  <CommandItem
                    key={audit.auditType}
                    onSelect={() => handleAuditSelect(audit.auditType)}
                    className={`cursor-pointer ${
                      selectedAuditType === audit.auditType
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : ''
                    }`}
                  >
                    <Span className="flex-shrink-0">{audit.emoji}</Span>
                    <Span className="flex-1 text-sm truncate">{audit.name}</Span>
                    <Badge className="bg-status-healthy/10 text-status-healthy border-status-healthy/20 px-1.5 py-0.5 text-[10px] leading-none flex-shrink-0">
                      {audit.score}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
              {good.length > 0 && <CommandSeparator />}
            </>
          )}

          {/* Good (80-89) */}
          {good.length > 0 && (
            <>
              <CommandGroup heading={`👍 Good (80-89) - ${good.length}`} headingVariant="degraded">
                {good.map(audit => (
                  <CommandItem
                    key={audit.auditType}
                    onSelect={() => handleAuditSelect(audit.auditType)}
                    className={`cursor-pointer ${
                      selectedAuditType === audit.auditType
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : ''
                    }`}
                  >
                    <Span className="flex-shrink-0">{audit.emoji}</Span>
                    <Span className="flex-1 text-sm truncate">{audit.name}</Span>
                    <Badge className="bg-status-degraded/10 text-status-degraded border-status-degraded/20 px-1.5 py-0.5 text-[10px] leading-none flex-shrink-0">
                      {audit.score}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
              {needsWork.length > 0 && <CommandSeparator />}
            </>
          )}

          {/* Needs Work (<80) */}
          {needsWork.length > 0 && (
            <CommandGroup
              heading={`⚠️ Needs Work (<80) - ${needsWork.length}`}
              headingVariant="unhealthy"
            >
              {needsWork.map(audit => (
                <CommandItem
                  key={audit.auditType}
                  onSelect={() => handleAuditSelect(audit.auditType)}
                  className={`cursor-pointer ${
                    selectedAuditType === audit.auditType
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : ''
                  }`}
                >
                  <Span className="flex-shrink-0">{audit.emoji}</Span>
                  <Span className="flex-1 text-sm truncate">{audit.name}</Span>
                  <Badge className="bg-status-unhealthy/10 text-status-unhealthy border-status-unhealthy/20 px-1.5 py-0.5 text-[10px] leading-none flex-shrink-0">
                    {audit.score}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>

      {/* Render filtered audits */}
      {children(filteredAudits)}
    </Div>
  )
}
