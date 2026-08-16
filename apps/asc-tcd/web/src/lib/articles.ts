import 'server-only'

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Content directory holding the markdown articles.
 * Resolved from the app root (`apps/asc-tcd/web`) which is the Next.js cwd
 * at build time — files are read statically during SSG.
 */
const ARTICLES_DIR = join(process.cwd(), 'src', 'content', 'articles')

const WORDS_PER_MINUTE = 200
const DEFAULT_AUTHOR = 'ASC TCD'

/** Article metadata parsed from the markdown frontmatter (no body). */
export interface ArticleMeta {
  /** URL slug, derived from the filename (without `.md`). */
  slug: string
  /** Headline, used as `<h1>`, card title and SEO title. */
  title: string
  /** Short summary, used as card excerpt and SEO description. */
  description: string
  /** Publication date, ISO `YYYY-MM-DD`. */
  date: string
  /** Optional cover image path (public asset or absolute URL). */
  cover?: string
  /** Free-form tags. */
  tags: string[]
  /** Author name (defaults to `ASC TCD`). */
  author: string
  /** When true, the article is hidden in production builds. */
  draft: boolean
  /** Estimated reading time in minutes (min 1). */
  readingMinutes: number
}

/** A full article: metadata + raw markdown body. */
export interface Article extends ArticleMeta {
  /** Raw markdown body (frontmatter stripped). */
  content: string
}

interface Frontmatter {
  data: Record<string, string>
  content: string
}

/**
 * Parse a leading YAML-ish frontmatter block delimited by `---` lines.
 *
 * Supports a deliberately small, documented subset: one `key: value` per line,
 * optional surrounding single/double quotes on the value, blank lines ignored.
 * Anything richer (nested objects, multiline values) is out of scope by design.
 */
function parseFrontmatter(raw: string): Frontmatter {
  const normalized = raw.replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---\n')) {
    return { data: {}, content: normalized.trim() }
  }

  const end = normalized.indexOf('\n---', 3)
  if (end === -1) {
    return { data: {}, content: normalized.trim() }
  }

  const block = normalized.slice(4, end)
  const content = normalized.slice(end + 4).replace(/^\n+/, '')

  const data: Record<string, string> = {}
  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const colon = trimmed.indexOf(':')
    if (colon === -1) continue
    const key = trimmed.slice(0, colon).trim()
    let value = trimmed.slice(colon + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key !== '') data[key] = value
  }

  return { data, content: content.trim() }
}

/** Split a comma-separated frontmatter value into trimmed, non-empty tags. */
function parseTags(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag !== '')
}

/** Estimate reading time from the markdown body (min 1 minute). */
function estimateReadingMinutes(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

/** Build a full {@link Article} from a filename + its raw file contents. */
function toArticle(fileName: string, raw: string): Article {
  const slug = fileName.replace(/\.md$/, '')
  const { data, content } = parseFrontmatter(raw)
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    date: data.date ?? '',
    cover: data.cover || undefined,
    tags: parseTags(data.tags),
    author: data.author || DEFAULT_AUTHOR,
    draft: data.draft === 'true',
    readingMinutes: estimateReadingMinutes(content),
    content,
  }
}

/** Read every markdown file in the content directory (drafts included). */
function readAllRaw(): Article[] {
  let fileNames: string[]
  try {
    fileNames = readdirSync(ARTICLES_DIR).filter(name => name.endsWith('.md'))
  } catch {
    // Directory absent (e.g. no articles yet) — treat as empty, never throw.
    return []
  }

  return fileNames.map(fileName => {
    const raw = readFileSync(join(ARTICLES_DIR, fileName), 'utf8')
    return toArticle(fileName, raw)
  })
}

/** True when the article should be visible in the current environment. */
function isVisible(article: Article): boolean {
  return !article.draft || process.env.NODE_ENV !== 'production'
}

/**
 * All published articles, newest first. Drafts are excluded in production.
 *
 * @example
 * ```ts
 * const articles = getAllArticles()
 * ```
 */
export function getAllArticles(): ArticleMeta[] {
  return readAllRaw()
    .filter(isVisible)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ content: _content, ...meta }) => meta)
}

/**
 * A single article by slug, or `null` when absent or draft-hidden in prod.
 *
 * @example
 * ```ts
 * const article = getArticleBySlug('mon-article')
 * ```
 */
export function getArticleBySlug(slug: string): Article | null {
  const article = readAllRaw().find(a => a.slug === slug)
  if (!article || !isVisible(article)) return null
  return article
}

/** All published article slugs — used by `generateStaticParams`. */
export function getAllArticleSlugs(): string[] {
  return getAllArticles().map(article => article.slug)
}

/**
 * Format an ISO `YYYY-MM-DD` date for display in the given locale.
 * Falls back to the raw string when the date is empty or invalid.
 */
export function formatArticleDate(date: string, locale: string): string {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed)
}
