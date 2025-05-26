// aliases.tsx
import type { TagProps, SupportedAs } from './components/tag';
import { Tag } from './components/tag';

function createAlias<T extends SupportedAs>(as: T) {
  return function Alias(props: Omit<TagProps<T>, 'as'>) {
    const allProps = { ...props, as } as TagProps<T>;
    return <Tag {...allProps} />;
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

// Forms
export const Button = createAlias('button');

// Typography
export const P = createAlias('p');

// Lists
export const Ul = createAlias('ul');
export const Ol = createAlias('ol');
export const Li = createAlias('li');
export const Dl = createAlias('dl');
export const Dt = createAlias('dt');
export const Dd = createAlias('dd');

//misc
export const Span = createAlias('span');
export const Div = createAlias('div');
