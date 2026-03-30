import { Button, Icon, Span } from '@ezstart/ui/components'
import React, { ReactNode } from 'react'

type Props = {
  icon?: string | ReactNode
  label?: string
}

const BoutiqueCta = ({ label = 'Equipez vous', icon }: Props): React.JSX.Element => {
  return (
    <Button asChild>
      <a
        href={'https://www.transplantation-arbres.fr/fr'}
        target="_blank"
        rel="noopener noreferrer"
      >
        {icon ? <Span className="mr-2">{icon}</Span> : <Icon name="lucide:ShoppingCart" />} {label}
      </a>
    </Button>
  )
}

export default BoutiqueCta
