// aliases.tsx — All Tag aliases centralized

import { createAlias } from './utils/create-alias'

// Container aliases
export const Div = createAlias('div')
export const Section = createAlias('section')
export const Aside = createAlias('aside')
export const Main = createAlias('main')
export const Nav = createAlias('nav')
export const Article = createAlias('article')

// Text aliases
export const Span = createAlias('span')
export const Strong = createAlias('strong')
export const P = createAlias('p')
export const Em = createAlias('em')
export const Small = createAlias('small')
export const Mark = createAlias('mark')

// Heading aliases
export const H1 = createAlias('h1')
export const H2 = createAlias('h2')
export const H3 = createAlias('h3')
export const H4 = createAlias('h4')
export const H5 = createAlias('h5')
export const H6 = createAlias('h6')

// List aliases
export const UL = createAlias('ul')
export const LI = createAlias('li')
export const Ol = createAlias('ol')

// Definition list aliases
export const Dl = createAlias('dl')
export const Dt = createAlias('dt')
export const Dd = createAlias('dd')

// Code & preformatted aliases
export const Pre = createAlias('pre')
export const Code = createAlias('code')
export const Blockquote = createAlias('blockquote')

// Media aliases
export const Figure = createAlias('figure')
export const Figcaption = createAlias('figcaption')

// Form grouping aliases (Note: Label is in forms/label.tsx)
export const Fieldset = createAlias('fieldset')
export const Legend = createAlias('legend')

// Disclosure aliases
export const Details = createAlias('details')
export const Summary = createAlias('summary')

// Misc aliases
export const Hr = createAlias('hr')
export const Time = createAlias('time')
export const Address = createAlias('address')

// Legacy alias
export const Header = createAlias('header')
export const FooterTag = createAlias('footer')
