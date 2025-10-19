import { IconProps } from '../types';

export default function Ezbill(props: IconProps) {
  return (
    <svg
      {...props}
      viewBox='0 0 47 47'
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      className={props.className}
      style={{
        width: props.size || 24,
        height: props.size || 24,
        minWidth: props.size || 24,
        minHeight: props.size || 24,
        ...props.style,
      }}
    >
      {/* Top-right rectangle (cyan to blue gradient) */}
      <rect x='24' y='1' width='22' height='22' rx='5' fill='url(#paint0_linear_ezbill)' />

      {/* Top-left rectangle (green to teal gradient) */}
      <rect x='1' y='1' width='22' height='22' rx='5' fill='url(#paint1_linear_ezbill)' />

      {/* Bottom rectangle (violet to purple gradient) */}
      <rect x='1' y='24' width='45' height='22' rx='5' fill='url(#paint2_linear_ezbill)' />

      <defs>
        {/* Cyan to Blue gradient (top-right) */}
        <linearGradient
          id='paint0_linear_ezbill'
          x1='24'
          y1='12'
          x2='46'
          y2='12'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#00D9F7' />
          <stop offset='1' stopColor='#4AA6F4' />
        </linearGradient>

        {/* Green to Teal gradient (top-left) */}
        <linearGradient
          id='paint1_linear_ezbill'
          x1='1'
          y1='12'
          x2='23'
          y2='12'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#6DDC74' />
          <stop offset='1' stopColor='#3AD5A2' />
        </linearGradient>

        {/* Violet to Purple gradient (bottom) */}
        <linearGradient
          id='paint2_linear_ezbill'
          x1='1'
          y1='35'
          x2='46'
          y2='35'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#798EF3' />
          <stop offset='1' stopColor='#B57FFF' />
        </linearGradient>
      </defs>
    </svg>
  );
}
