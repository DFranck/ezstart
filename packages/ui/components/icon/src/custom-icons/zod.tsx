import { IconProps } from '../types';

const Zod = (props: IconProps) => {
  return (
    <svg
      height={props.size || 24}
      width={props.size || 24}
      className={props.className}
      viewBox='0 0 58 48'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M14.6698 5.48462H41.709L49.6324 13.7566L27.2138 38.8664L6.3645 13.7566L14.6698 5.48462Z'
        fill='#18253F'
      />
      <path
        d='M32.6482 32.9354H22.0503L17.2637 27.0756L30.8279 27.0751L30.8284 26.2439H38.5819L32.6482 32.9354Z'
        fill='#274D82'
      />
      <path
        d='M47.3571 11.3973L18.1147 28.2804L14.3 23.5083L36.9387 10.4374L36.5229 9.71696L42.5528 6.2356L47.3571 11.3973Z'
        fill='#274D82'
      />
      <path
        d='M31.6898 5.49286L9.73226 18.17L6.31738 13.907L21.0187 5.41919L31.6898 5.49286Z'
        fill='#274D82'
      />
      <g filter='url(#filter0_d_221_1053)'>
        <path
          d='M42.766 3H13.641L3 13.5863L27.1588 42.6783L29.0861 40.5158L53 13.6856L42.766 3ZM41.702 5.49247L49.6068 13.7465L27.2257 38.8572L6.37297 13.7465L14.6696 5.49247H41.702Z'
          fill='black'
        />
      </g>
      <path
        d='M42.766 3H13.641L3 13.5863L27.1588 42.6783L29.0861 40.5158L53 13.6856L42.766 3ZM41.702 5.49247L49.6068 13.7465L27.2257 38.8572L6.37297 13.7465L14.6696 5.49247H41.702Z'
        fill='#3068B7'
      />
      <defs>
        <filter
          id='filter0_d_221_1053'
          x='0'
          y='0'
          width='58'
          height='47.6782'
          filterUnits='userSpaceOnUse'
          color-interpolation-filters='sRGB'
        >
          <feFlood flood-opacity='0' result='BackgroundImageFix' />
          <feColorMatrix
            in='SourceAlpha'
            type='matrix'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
            result='hardAlpha'
          />
          <feOffset dx='1' dy='1' />
          <feGaussianBlur stdDeviation='2' />
          <feColorMatrix
            type='matrix'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.36 0'
          />
          <feBlend
            mode='normal'
            in2='BackgroundImageFix'
            result='effect1_dropShadow_221_1053'
          />
          <feBlend
            mode='normal'
            in='SourceGraphic'
            in2='effect1_dropShadow_221_1053'
            result='shape'
          />
        </filter>
      </defs>
    </svg>
  );
};

export default Zod;
