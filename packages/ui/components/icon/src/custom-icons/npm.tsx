import { IconProps } from '../types';

export default function Npm(props: IconProps) {
  return (
    <svg
      {...props}
      viewBox='0 0 24 24'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      height={props.size}
      width={props.size}
    >
      <title>NPM Logo</title>
      <path d='M0 0v24h24V0H0zm20 20h-4v-6H8v6H4V4h16v16z' />
    </svg>
  );
}
