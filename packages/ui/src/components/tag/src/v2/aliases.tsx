/**
 * EzTag v2 - Alias Components
 *
 * Pre-built optimized components for common HTML tags
 * Same names as v1 (H1, H2, Div, Section, etc.) for compatibility
 */

import { createAlias } from './create-alias'

// ============================================================================
// HEADINGS
// ============================================================================

/**
 * H1 - Heading level 1
 * @example
 * <H1 size="h1">Main Title</H1>
 * <H1 size="h1" variant="link">Clickable Title</H1>
 */
export const H1 = createAlias('h1')

/**
 * H2 - Heading level 2
 * @example
 * <H2 size="h2">Section Title</H2>
 */
export const H2 = createAlias('h2')

/**
 * H3 - Heading level 3
 * @example
 * <H3 size="h3">Subsection Title</H3>
 */
export const H3 = createAlias('h3')

/**
 * H4 - Heading level 4
 * @example
 * <H4 size="h4">Small Heading</H4>
 */
export const H4 = createAlias('h4')

/**
 * H5 - Heading level 5
 */
export const H5 = createAlias('h5')

/**
 * H6 - Heading level 6
 */
export const H6 = createAlias('h6')

// ============================================================================
// TYPOGRAPHY
// ============================================================================

/**
 * P - Paragraph
 * @example
 * <P>Regular paragraph text</P>
 * <P variant="muted">Muted text</P>
 * <P variant="lead">Lead paragraph</P>
 */
export const P = createAlias('p')

/**
 * Span - Inline text
 * @example
 * <Span>Inline text</Span>
 * <Span className="font-bold">Bold text</Span>
 */
export const Span = createAlias('span')

// ============================================================================
// LAYOUT
// ============================================================================

/**
 * Div - Generic container
 * @example
 * <Div layout="col" size="md" variant="card">
 *   <H2>Card Title</H2>
 *   <P>Card content</P>
 * </Div>
 */
export const Div = createAlias('div')

/**
 * Section - Semantic section
 * @example
 * <Section layout="col" size="lg" ariaLabel="Features section">
 *   <H2>Features</H2>
 *   <Div layout="grid">...</Div>
 * </Section>
 */
export const Section = createAlias('section')

/**
 * Main - Main content area
 * @example
 * <Main layout="col" size="xl">
 *   <H1>Page Title</H1>
 *   <P>Content</P>
 * </Main>
 */
export const Main = createAlias('main')

/**
 * Header - Page or section header
 * @example
 * <Header layout="row" size="md" variant="card">
 *   <H1>Site Title</H1>
 * </Header>
 */
export const Header = createAlias('header')

/**
 * Footer - Page or section footer
 * @example
 * <Footer layout="row" size="sm" variant="muted">
 *   <P>© 2025 Company</P>
 * </Footer>
 */
export const Footer = createAlias('footer')

/**
 * Aside - Sidebar or complementary content
 * @example
 * <Aside layout="col" size="sm" variant="card">
 *   <H3>Related</H3>
 * </Aside>
 */
export const Aside = createAlias('aside')

/**
 * Nav - Navigation container
 * @example
 * <Nav layout="row" ariaLabel="Main navigation">
 *   <a href="/">Home</a>
 *   <a href="/about">About</a>
 * </Nav>
 */
export const Nav = createAlias('nav')

/**
 * Article - Self-contained content
 * @example
 * <Article layout="col" size="md" variant="card">
 *   <H2>Blog Post Title</H2>
 *   <P>Content...</P>
 * </Article>
 */
export const Article = createAlias('article')

// ============================================================================
// LISTS
// ============================================================================

/**
 * Ul - Unordered list
 * @example
 * <Ul>
 *   <Li>Item 1</Li>
 *   <Li>Item 2</Li>
 * </Ul>
 */
export const Ul = createAlias('ul')

/**
 * Ol - Ordered list
 * @example
 * <Ol>
 *   <Li>First</Li>
 *   <Li>Second</Li>
 * </Ol>
 */
export const Ol = createAlias('ol')

/**
 * Li - List item
 */
export const Li = createAlias('li')

// ============================================================================
// FORMS - NOT INCLUDED
// ============================================================================
// Label, Fieldset, Legend are NOT provided by EzTag v2.
// Use shadcn/ui components instead:
// - Label: @ezstart/ui/components/label (Radix-based, better accessibility)
// - Input: @ezstart/ui/components/input
// - Textarea: @ezstart/ui/components/textarea
// ============================================================================
