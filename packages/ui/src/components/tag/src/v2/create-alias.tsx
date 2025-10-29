/**
 * EzTag v2 - Alias Factory
 *
 * Creates optimized alias components (H1, H2, Div, Section, etc.)
 * using React.memo for performance
 */

import React, { ElementType } from 'react'
import { EzTag } from './EzTag'
import { EzTagProps } from './types'

/**
 * Create a memoized alias component for a specific HTML tag
 *
 * @example
 * export const H1 = createAlias('h1')
 * export const Div = createAlias('div')
 *
 * // Usage:
 * <H1 size="h1">Title</H1>
 * <Div layout="col" size="md">Content</Div>
 */
export function createAlias<T extends ElementType>(tag: T) {
  const AliasComponent = React.memo(
    React.forwardRef<any, Omit<EzTagProps<T>, 'as'>>(
      (props, _ref) => {
        return <EzTag {...props} as={tag} />
      }
    )
  ) as React.NamedExoticComponent<Omit<EzTagProps<T>, 'as'>> & { displayName?: string }

  // Set display name for better debugging
  const tagName = typeof tag === 'string' ? tag : 'Component'
  const capitalizedName = tagName.charAt(0).toUpperCase() + tagName.slice(1)
  AliasComponent.displayName = capitalizedName

  return AliasComponent
}

/**
 * Default export
 */
export default createAlias
