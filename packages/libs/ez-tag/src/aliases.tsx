// aliases.tsx
import type { EzTagProps, SupportedAs } from './components/EzTag';
import { EzTag } from './components/EzTag';

function createAlias<T extends SupportedAs>(as: T) {
  return function Alias(props: Omit<EzTagProps<T>, 'as'>) {
    const allProps = { ...props, as } as EzTagProps<T>;
    return <EzTag {...allProps} />;
  };
}

// Headings
export const H1 = createAlias('h1');
export const H2 = createAlias('h2');
export const H3 = createAlias('h3');
export const H4 = createAlias('h4');
export const H5 = createAlias('h5');
export const H6 = createAlias('h6');

// Layouts
export const Section = createAlias('section');
export const Main = createAlias('main');

// Forms & misc
export const Button = createAlias('button');
export const Span = createAlias('span');
export const Div = createAlias('div');
