import 'server-only'

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { estimateReadingMinutes, parseFrontmatter } from './articles'

/** Directory holding the book chapters (one markdown file per chapter). */
const BOOK_DIR = join(process.cwd(), 'src', 'content', 'livre')

/** Public path of the free PDF — the download button only shows when it exists. */
const PDF_PUBLIC_PATH = '/livre/transplantation-arbres-odd.pdf'

/** Static book metadata, shared by the hub, JSON-LD and the `llms.txt` index. */
export const BOOK = {
  title: "Transplantation d'arbres & Objectifs de Développement Durable (ODD)",
  subtitle: 'Technique ultime pour végétaliser nos villes',
  description:
    "Livre gratuit d'Ambre Seradni sur la transplantation d'arbres adultes : méthode, résultats, Plan Local de l'Arbre et contribution aux ODD (ODD 11, villes durables).",
  author: 'Ambre Seradni',
  publisher: 'ASC-TCD',
  datePublished: '2023-11',
  language: 'fr',
} as const

/** Chapter metadata parsed from the markdown frontmatter (no body). */
export interface ChapterMeta {
  /** URL slug: filename without the numeric order prefix and `.md`. */
  slug: string
  /** Sort order, from the filename prefix (`01-…`). */
  order: number
  title: string
  description: string
  /** Part heading, e.g. `Partie 1 : Retour sur la transplantation`. */
  part: string
  /** Chapter label, e.g. `Chapitre 1`. */
  chapter: string
  cover?: string
  /** Last editorial update, ISO `YYYY-MM-DD`. */
  updated: string
  readingMinutes: number
  wordCount: number
}

/** A full chapter: metadata + raw markdown body. */
export interface Chapter extends ChapterMeta {
  content: string
}

function toChapter(fileName: string, raw: string): Chapter {
  const base = fileName.replace(/\.md$/, '')
  const match = /^(\d+)-(.+)$/.exec(base)
  const { data, content } = parseFrontmatter(raw)
  return {
    slug: match?.[2] ?? base,
    order: match ? Number(match[1]) : 0,
    title: data.title ?? base,
    description: data.description ?? '',
    part: data.part ?? '',
    chapter: data.chapter ?? '',
    cover: data.cover || undefined,
    updated: data.updated ?? '',
    readingMinutes: estimateReadingMinutes(content),
    wordCount: content.split(/\s+/).filter(Boolean).length,
    content,
  }
}

function readAllChapters(): Chapter[] {
  let fileNames: string[]
  try {
    fileNames = readdirSync(BOOK_DIR).filter(name => name.endsWith('.md'))
  } catch {
    return []
  }
  return fileNames
    .map(fileName => toChapter(fileName, readFileSync(join(BOOK_DIR, fileName), 'utf8')))
    .sort((a, b) => a.order - b.order)
}

/** All published chapters in reading order, without their body. */
export function getAllChapters(): ChapterMeta[] {
  return readAllChapters().map(({ content: _content, ...meta }) => meta)
}

/** One chapter by slug, or `null` when absent. */
export function getChapterBySlug(slug: string): Chapter | null {
  return readAllChapters().find(chapter => chapter.slug === slug) ?? null
}

/** All chapter slugs — used by `generateStaticParams` and the sitemap. */
export function getAllChapterSlugs(): string[] {
  return getAllChapters().map(chapter => chapter.slug)
}

/** Previous and next chapters around `slug` (either may be `null`). */
export function getAdjacentChapters(slug: string): {
  prev: ChapterMeta | null
  next: ChapterMeta | null
} {
  const chapters = getAllChapters()
  const index = chapters.findIndex(chapter => chapter.slug === slug)
  if (index === -1) return { prev: null, next: null }
  return { prev: chapters[index - 1] ?? null, next: chapters[index + 1] ?? null }
}

/** Public URL of the free PDF, or `null` while the file has not been added. */
export function getBookPdfUrl(): string | null {
  return existsSync(join(process.cwd(), 'public', PDF_PUBLIC_PATH)) ? PDF_PUBLIC_PATH : null
}
