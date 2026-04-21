import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ApplicationCard } from '../../../components/applications/ApplicationCard.js'
import type { Application } from '../../../core/types.js'

const fakeApp: Application = {
  id: 'app_1',
  slug: 'acme',
  name: 'Acme Corp',
  description: 'A long description for Acme Corp',
  ownerId: 'user_1',
  status: 'active',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
}

describe('ApplicationCard', () => {
  it('renders slug, name and description', () => {
    render(<ApplicationCard application={fakeApp} />)
    expect(screen.getByText('acme')).toBeTruthy()
    expect(screen.getByText('Acme Corp')).toBeTruthy()
    expect(screen.getByText('A long description for Acme Corp')).toBeTruthy()
  })

  it('renders Active badge for active apps', () => {
    render(<ApplicationCard application={fakeApp} />)
    expect(screen.getByText('Active')).toBeTruthy()
  })

  it('renders Archived badge for archived apps', () => {
    render(<ApplicationCard application={{ ...fakeApp, status: 'archived' }} />)
    expect(screen.getByText('Archived')).toBeTruthy()
  })

  it('renders keyCount when provided', () => {
    render(<ApplicationCard application={fakeApp} keyCount={5} />)
    expect(screen.getByText('5 keys')).toBeTruthy()
  })

  it('calls onSelect when Manage button is clicked', () => {
    const onSelect = vi.fn()
    render(<ApplicationCard application={fakeApp} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Manage'))
    expect(onSelect).toHaveBeenCalledWith(fakeApp)
  })

  it('does not render Manage button without onSelect', () => {
    render(<ApplicationCard application={fakeApp} />)
    expect(screen.queryByText('Manage')).toBeNull()
  })

  it('calls onArchive when AlertDialog action is confirmed', async () => {
    const onArchive = vi.fn().mockResolvedValue(undefined)
    render(<ApplicationCard application={fakeApp} onArchive={onArchive} />)

    // Open via trigger button (first Archive) then click action (last Archive)
    const archiveButtons = screen.getAllByText('Archive')
    // trigger = first Archive text (inside <Button>)
    fireEvent.click(archiveButtons[0])
    // action = the confirmation button (rendered as AlertDialogAction)
    const afterClick = screen.getAllByText('Archive')
    fireEvent.click(afterClick[afterClick.length - 1])

    await vi.waitFor(() => expect(onArchive).toHaveBeenCalledWith(fakeApp))
  })

  it('does not render Archive trigger button for archived apps', () => {
    const onArchive = vi.fn()
    const { container } = render(
      <ApplicationCard application={{ ...fakeApp, status: 'archived' }} onArchive={onArchive} />
    )
    // Only buttons inside the <Button> component count as triggers
    const triggerButtons = Array.from(container.querySelectorAll('button')).filter(
      b => b.getAttribute('data-testid') === null || b.getAttribute('data-testid') === 'Button'
    )
    // No trigger button renders the "Archive" label
    const hasArchiveTrigger = triggerButtons.some(
      b =>
        b.textContent?.includes('Archive') &&
        !b.getAttribute('data-testid')?.startsWith('AlertDialog')
    )
    expect(hasArchiveTrigger).toBe(false)
  })

  it('accepts custom texts', () => {
    render(
      <ApplicationCard
        application={fakeApp}
        onSelect={vi.fn()}
        texts={{
          manage: 'Gerer',
          archive: 'Archiver',
          archiveTitle: '',
          archiveConfirm: '',
          archiveConfirmCascade: '',
          archiveCancel: 'Annuler',
          archiveSubmit: 'Confirmer',
          archiveSuccess: '',
          archiveFailed: '',
          statusActive: 'Actif',
          statusArchived: 'Archive',
          createdLabel: 'Cree',
          keysLabel: 'cles',
        }}
      />
    )
    expect(screen.getByText('Gerer')).toBeTruthy()
    expect(screen.getByText('Actif')).toBeTruthy()
  })
})
