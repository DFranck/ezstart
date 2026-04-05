'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

interface DebugSection {
  id: string
  title: string
  icon: string
  children: ReactNode
  defaultExpanded?: boolean
}

interface DebugPanelProps {
  sections: DebugSection[]
  title?: string
  defaultPosition?: { x: number; y: number }
}

export const DebugPanel = ({
  sections,
  title = '🔧 Debug Panel',
  defaultPosition = { x: 10, y: 10 },
}: DebugPanelProps) => {
  // Drag state
  const [position, setPosition] = useState(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Collapsible state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.filter(s => s.defaultExpanded).map(s => s.id))
  )

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return

    const rect = panelRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setIsDragging(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    // Keep within viewport bounds
    const maxX = window.innerWidth - 300 // Approximate width
    const maxY = window.innerHeight - 400 // Approximate height

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const isExpanded = (sectionId: string) => expandedSections.has(sectionId)

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 9999,
        fontFamily: 'monospace',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
        minWidth: '280px',
        maxWidth: '350px',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px 8px 0 0',
        }}
      >
        {title}
      </div>

      {/* Sections */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {sections.map((section, index) => (
          <div key={section.id}>
            {/* Section Header */}
            <div
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: isExpanded(section.id) ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderBottom:
                  index < sections.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.2s ease',
              }}
              onClick={() => toggleSection(section.id)}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isExpanded(section.id)
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </div>
              <span
                style={{
                  transition: 'transform 0.2s ease',
                  transform: isExpanded(section.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                ▶
              </span>
            </div>

            {/* Section Content */}
            {isExpanded(section.id) && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  borderBottom:
                    index < sections.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                }}
              >
                {section.children}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
