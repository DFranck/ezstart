import type { LucideProps } from 'lucide-react';

export default function NpmLogo(props: LucideProps) {
  return (
    <svg
      {...props}
      viewBox='0 0 24 24'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
    >
      <title>NPM Logo</title>
      <path d='M0 0v24h24V0H0zm20 20h-4v-6H8v6H4V4h16v16z' />
    </svg>
  );
}
