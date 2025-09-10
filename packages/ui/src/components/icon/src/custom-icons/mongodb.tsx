import { IconProps } from '../types';

const Mongodb = (props: IconProps) => {
  return (
    <svg
      className={props.className}
      style={{
        width: props.size || 24,
        height: props.size || 24,
        minWidth: props.size || 24,
        minHeight: props.size || 24,
        ...props.style,
      }}
      viewBox='0 0 50 50'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <rect
        width='50'
        height='50'
        rx='4'
        fill={props.fill ? `hsl(var(--${props.fill}))` : 'currentColor'}
      />
      <path
        d='M21.5408 11.1182C23.1269 9.27829 24.493 7.40968 24.772 7.02157C24.8014 6.99281 24.8453 6.99281 24.8747 7.02157C25.1537 7.40968 26.5198 9.27829 28.106 11.1182C41.7208 28.0938 25.9617 39.5499 25.9617 39.5499L25.8296 39.6361C25.7118 41.4042 25.418 43.9485 25.418 43.9485H24.8305H24.243C24.243 43.9485 23.9493 41.4184 23.8319 39.6361L23.6997 39.5356C23.685 39.5499 7.9259 28.0938 21.5408 11.1182ZM24.8305 39.3057C24.8305 39.3057 25.5358 38.7161 25.7265 38.4146V38.3857L24.8747 19.9007C24.8747 19.8432 24.7867 19.8432 24.7867 19.9007L23.9349 38.3857V38.4146C24.1256 38.7161 24.8305 39.3057 24.8305 39.3057Z'
        className='fill-[#00ED64] dark:fill-[#00684A]'
      />
    </svg>
  );
};

export default Mongodb;
