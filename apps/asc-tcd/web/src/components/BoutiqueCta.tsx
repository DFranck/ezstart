import { Button, Icon } from '@ezstart/ui/components';
import { ReactNode } from 'react';

type Props = {
  icon?: string | ReactNode;
  label?: string;
};

const BoutiqueCta = ({ label = 'Equipez vous', icon }: Props): any => {
  return (
    <Button asChild>
      <a
        href={'https://www.transplantation-arbres.fr/fr'}
        target='_blank'
        rel='noopener noreferrer'
      >
        {icon ? (
          <span className='mr-2'>{icon}</span>
        ) : (
          <Icon name='lucide:ShoppingCart' />
        )}{' '}
        {label}
      </a>
    </Button>
  );
};

export default BoutiqueCta;
