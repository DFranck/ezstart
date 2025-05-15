import type { LucideProps } from 'lucide-react';
import { customIcons } from '../types/icon';

interface customIconsProps extends LucideProps {
  name: (typeof customIcons)[number];
  size?: number;
  props: LucideProps;
}

export default function NpmLogo({ props, size = 24 }: customIconsProps) {
  return (
    <svg
      {...props}
      viewBox='0 0 24 24'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      height={size}
      width={size}
    >
      <title>NPM Logo</title>
      <path d='M0 0v24h24V0H0zm20 20h-4v-6H8v6H4V4h16v16z' />
    </svg>
  );
}
