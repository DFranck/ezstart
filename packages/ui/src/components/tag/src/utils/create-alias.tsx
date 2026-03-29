import React from 'react'
import { Tag, TagProps } from '../components/tag'
import { SupportedAs } from '../types'

export function createAlias<T extends SupportedAs>(as: T) {
  const AliasComponent = React.memo(
    React.forwardRef<any, Omit<TagProps<T>, 'as'>>((props, _ref) => {
      const allProps = { ...props, as } as unknown as TagProps<T>
      return <Tag {...allProps} />
    })
  ) as React.NamedExoticComponent<Omit<TagProps<T>, 'as'>> & {
    displayName?: string
  }

  const tagName = typeof as === 'string' ? as : 'Component'
  AliasComponent.displayName = tagName.charAt(0).toUpperCase() + tagName.slice(1)

  return AliasComponent
}
