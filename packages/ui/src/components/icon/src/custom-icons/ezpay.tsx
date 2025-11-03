import { IconProps } from '../types';

export default function Ezpay(props: IconProps) {
  return (
    <svg
      {...props}
      viewBox='0 0 512 512'
      xmlns='http://www.w3.org/2000/svg'
      className={props.className}
      style={{
        width: props.size || 24,
        height: props.size || 24,
        minWidth: props.size || 24,
        minHeight: props.size || 24,
        ...props.style,
      }}
    >
      <g clipPath='url(#clip0_ezpay)'>
        <path
          d='M256 512C397.385 512 512 397.385 512 256C512 114.615 397.385 0 256 0C114.615 0 0 114.615 0 256C0 397.385 114.615 512 256 512Z'
          fill='url(#paint0_linear_ezpay)'
        />
        <path
          d='M455.239 248.462C465.278 254.258 465.278 268.747 455.239 274.543L153.338 448.846C143.299 454.642 130.75 447.396 130.75 435.804V87.1999C130.75 75.6076 143.299 68.3625 153.338 74.1587L455.239 248.462Z'
          fill='black'
        />
        <path
          d='M296.54 349.249V311.602L325.595 227L255 189.736V152.089L362.5 213.76V228.819L341.716 289.013L424.54 243.837C424.54 243.837 433.718 248.425 439.599 251.366C454.657 258.896 439.599 265.719 439.599 265.719L296.54 349.249Z'
          fill={props.fill ? `hsl(var(--${props.fill}))` : '#EC5990'}
        />
        <path
          d='M255 152.089V189.736L205.274 161.013V236.557L236.304 237V282.665H205.274V356.778L296.54 311.602V349.249C296.54 349.249 198.864 401.122 176.069 417.014C153.276 432.904 145.952 424.543 145.952 401.955V115.836V100.778C145.952 96.4247 149.659 93.2982 153.481 93.2482C158.398 93.1837 161.113 94.8131 170.336 100.349L171.05 100.778L255 152.089Z'
          fill={props.fill ? `hsl(var(--${props.fill}))` : '#D9D9D9'}
        />
      </g>
      <defs>
        <linearGradient
          id='paint0_linear_ezpay'
          x1='256'
          y1='0'
          x2='256'
          y2='512'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='white' />
          <stop offset='1' />
        </linearGradient>
        <clipPath id='clip0_ezpay'>
          <rect width='512' height='512' fill='white' />
        </clipPath>
      </defs>
    </svg>
  );
}
