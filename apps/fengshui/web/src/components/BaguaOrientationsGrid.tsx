/* path: /components/BaguaOrientationsGrid.tsx */
'use client'

import { DIRECTIONS_WITH_CENTER, Direction } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Icon, Button } from '@ezstart/ui/components'
import { useState } from 'react'

type Props = {
  config?: YearBaguaConfig
}

export default function BaguaOrientationsGrid({ config }: Props) {
  const [expandedSectors, setExpandedSectors] = useState<Set<Direction>>(new Set())

  const toggleSector = (dir: Direction) => {
    setExpandedSectors(prev => {
      const next = new Set(prev)
      if (next.has(dir)) {
        next.delete(dir)
      } else {
        next.add(dir)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedSectors(new Set(DIRECTIONS_WITH_CENTER))
  }

  const collapseAll = () => {
    setExpandedSectors(new Set())
  }

  if (!config) {
    return (
      <div className="text-center text-gray-500 py-12">
        <Icon name="lucide:Loader2" className="w-8 h-8 mx-auto mb-4 animate-spin" />
        <p>Chargement de la configuration Bagua...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Orientations Bagua</h2>
        <div className="flex gap-2">
          <Button
            onClick={expandAll}
            variant="link"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors p-0 h-auto"
          >
            Tout ouvrir
          </Button>
          <span className="text-gray-300">•</span>
          <Button
            onClick={collapseAll}
            variant="link"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors p-0 h-auto"
          >
            Tout fermer
          </Button>
        </div>
      </div>

      {/* Grille des secteurs */}
      <div className="space-y-3">
        {DIRECTIONS_WITH_CENTER.map(dir => {
          const sector = config.orientations[dir]
          if (!sector) return null

          const isExpanded = expandedSectors.has(dir)
          const accent = getElementColor(sector.element)

          return (
            <SectorCard
              key={dir}
              direction={dir}
              sector={sector}
              accent={accent}
              isExpanded={isExpanded}
              onToggle={() => toggleSector(dir)}
            />
          )
        })}
      </div>
    </div>
  )
}

type SectorCardProps = {
  direction: Direction
  sector: any
  accent: string
  isExpanded: boolean
  onToggle: () => void
}

function SectorCard({ direction, sector, accent, isExpanded, onToggle }: SectorCardProps) {
  const has = {
    keywords: !!sector.keywords?.length,
    tips: !!sector.tips?.length,
    enhancers: !!sector.enhancers?.length,
    remedies: !!sector.remedies?.length,
    avoid: !!sector.avoid?.length,
    symbols: !!sector.symbols?.length,
    notes: !!sector.notes,
  }

  return (
    <div
      className="bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all"
      style={{ borderTopColor: accent, borderTopWidth: '3px' }}
    >
      {/* Header cliquable */}
      <Button
        onClick={onToggle}
        variant="ghost"
        className="w-full p-4 text-left hover:bg-gray-50/50 transition-colors rounded-t-2xl h-auto justify-start"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {sector.icon && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${accent}15` }}
              >
                <Icon name={sector.icon} className="w-5 h-5" style={{ color: accent }} />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{sector.title}</h3>
                <span
                  className="px-2 py-1 text-xs font-semibold rounded-full"
                  style={{
                    color: accent,
                    backgroundColor: `${accent}15`,
                    border: `1px solid ${accent}30`,
                  }}
                >
                  {sector.element}
                </span>
                <span className="text-xs text-gray-500 font-medium">{direction}</span>
              </div>
              {sector.summary && <p className="text-sm text-gray-600 mt-1">{sector.summary}</p>}
            </div>
          </div>

          <Icon
            name={isExpanded ? 'lucide:ChevronUp' : 'lucide:ChevronDown'}
            className="w-5 h-5 text-gray-400 transition-transform"
          />
        </div>
      </Button>

      {/* Contenu développable */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
          {/* Bagua de Base - Informations permanentes */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Activateurs de base */}
              <div>
                <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                  <Icon name="lucide:Sparkles" className="w-4 h-4" />
                  Activateurs naturels
                </h5>
                <ul className="space-y-1">
                  {sector.enhancers.map((enhancer: string, idx: number) => (
                    <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      {enhancer}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Matières favorables */}
              <div>
                <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                  <Icon name="lucide:Package" className="w-4 h-4" />
                  Matières favorables
                </h5>
                <p className="text-sm text-blue-700">{sector.matiere}</p>
              </div>
            </div>

            {/* Cycles des éléments */}
            <div className="mt-4">
              <h5 className="font-semibold text-blue-800 mb-2">Cycles des 5 éléments</h5>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-green-100 rounded border border-green-300">
                  <p className="font-medium text-green-800">Nourri par</p>
                  <p className="text-green-700">{sector.nourisher}</p>
                </div>
                <div className="text-center p-2 bg-red-100 rounded border border-red-300">
                  <p className="font-medium text-red-800">Contrôlé par</p>
                  <p className="text-red-700">{sector.controller}</p>
                </div>
                <div className="text-center p-2 bg-orange-100 rounded border border-orange-300">
                  <p className="font-medium text-orange-800">Affaibli par</p>
                  <p className="text-orange-700">{sector.weakenedBy}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Étoiles Volantes - Informations temporaires */}
          {sector.star && (
            <div
              className="p-4 rounded-lg border-2"
              style={{
                borderColor: sector.star.status === 'bonne' ? '#16a34a' : '#dc2626',
                backgroundColor: sector.star.status === 'bonne' ? '#dcfce7' : '#fef2f2',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon
                  name={sector.star.status === 'bonne' ? 'lucide:Star' : 'lucide:AlertTriangle'}
                  className="w-5 h-5"
                  style={{ color: sector.star.status === 'bonne' ? '#16a34a' : '#dc2626' }}
                />
                <h4
                  className="font-bold"
                  style={{ color: sector.star.status === 'bonne' ? '#16a34a' : '#dc2626' }}
                >
                  Étoile Volante 2025 ({sector.star.status})
                </h4>
              </div>

              <div className="mb-3">
                <h5 className="font-semibold text-gray-800 mb-1">⭐ {sector.star.star}</h5>
                {sector.star.element && (
                  <p className="text-sm text-gray-600">Élément : {sector.star.element}</p>
                )}
              </div>

              {sector.star.remedies.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                    <Icon name="lucide:Shield" className="w-4 h-4" />
                    Remèdes spécifiques 2025
                  </h5>
                  <ul className="space-y-1">
                    {sector.star.remedies.map((remedy: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mt-2 flex-shrink-0" />
                        {remedy}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type InfoSectionProps = {
  title: string
  items: string[]
  icon: string
  accent: string
  danger?: boolean
}

function InfoSection({ title, items, icon, accent, danger }: InfoSectionProps) {
  const color = danger ? '#dc2626' : accent

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
        <Icon name={icon as any} className="w-4 h-4" style={{ color }} />
        {title}
      </h4>
      <ul className="space-y-1">
        {items.map((item: string, index: number) => (
          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function getElementColor(element: string): string {
  switch (element) {
    case 'Eau':
      return '#0D47A1'
    case 'Bois':
      return '#2E7D32'
    case 'Feu':
      return '#D32F2F'
    case 'Terre':
      return '#BCA16A'
    case 'Métal':
      return '#B0BEC5'
    default:
      return '#94a3b8'
  }
}
