/**
 * CLI-only helpers for `rotate-keys.ts` — extracted to keep the main
 * script under the standard 400-line cap. Anything in this file is pure
 * presentation / filesystem (dump file, stdout summary), no DB work.
 *
 * @module apps/ezpay/api/src/scripts/rotate-keys-cli
 * @internal
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { RotateKeysResult } from './rotate-keys.js'

/**
 * Resolve the absolute path to the monorepo `tmp/` directory — robust against
 * cwd. Walks up from this file location (src/scripts/ OR dist/scripts/).
 */
function resolveTmpDir(): string {
  // <root>/apps/ezpay/api/src/scripts/rotate-keys-cli.ts  → 5 levels up = root
  // <root>/apps/ezpay/api/dist/scripts/rotate-keys-cli.js → 5 levels up = root
  const here = new URL('.', import.meta.url).pathname
  const normalised = process.platform === 'win32' ? here.replace(/^\//, '') : here
  return resolve(normalised, '..', '..', '..', '..', '..', 'tmp')
}

/** Build the dump file content for newly-rotated keys, or `null` if none. */
export function buildDumpContent(result: RotateKeysResult, timestamp: string): string | null {
  const created = result.rotated.filter(r => r.rawKey !== undefined)
  if (created.length === 0) return null

  const lines: string[] = [
    '# rotate-keys raw key dump (ezpay)',
    `# generated: ${timestamp}`,
    `# env:       ${result.options.env}`,
    '#',
    '# Each entry is the NEW raw key freshly minted by the rotation script.',
    '# Copy them into the matching `.env.<env>` file for the consuming app and',
    '# push to Vercel/Railway. The OLD key has been revoked in the ezpay DB.',
    '# This file is gitignored. DELETE IT once you have transferred the values.',
    '',
  ]

  for (const r of created) {
    lines.push(`## ${r.appSlug} — ${r.type}/${r.env} (createdBy=${r.createdBy})`)
    lines.push(`#  applicationId: ${r.applicationId}`)
    lines.push(`#  oldKeyPrefix:  ${r.oldKeyPrefix}`)
    lines.push(`#  newKeyPrefix:  ${r.newKeyPrefix}`)
    lines.push(`${r.rawKey}`)
    lines.push('')
  }

  return lines.join('\n')
}

/** Dump the new raw keys to a timestamped file under `tmp/`. */
export function dumpRawKeysToTmpFile(result: RotateKeysResult): string | null {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const content = buildDumpContent(result, timestamp)
  if (!content) return null

  const tmpDir = resolveTmpDir()
  mkdirSync(tmpDir, { recursive: true })
  const filePath = resolve(tmpDir, `rotate-keys-${timestamp}.txt`)
  writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 })
  return filePath
}

/** Print the result summary table (plan / rotation / skip lines). */
export function printSummary(result: RotateKeysResult): void {
  console.info('=== rotate-keys result (ezpay) ===')
  console.info('')
  console.info(`  env:           ${result.options.env}`)
  console.info(`  rotated:       ${result.rotated.length} keys`)
  console.info(`  skipped:       ${result.skipped.length} keys (too recent — use --force)`)
  console.info('')

  for (const r of result.rotated) {
    const tag = result.options.dryRun ? 'PLAN' : 'ROT '
    console.info(
      `  ${tag} ${r.appSlug.padEnd(16)} ${r.type}/${r.env} ` +
        `oldPrefix=${r.oldKeyPrefix}` +
        (r.newKeyPrefix ? ` → newPrefix=${r.newKeyPrefix}` : '')
    )
  }
  for (const s of result.skipped) {
    console.info(`  SKIP ${s.appSlug.padEnd(16)} prefix=${s.oldKeyPrefix}  reason=${s.reason}`)
  }
}

/** Print the "save now" block + dump-file pointer for non-dry-run runs. */
export function printRawKeyDump(result: RotateKeysResult, dumpPath: string | null): void {
  console.info('')
  console.info('⚠️  New raw keys shown ONCE — save them NOW to a secure location:')
  console.info('')
  for (const r of result.rotated) {
    if (!r.rawKey) continue
    console.info(`  # ${r.appSlug} ${r.type}/${r.env}  (applicationId: ${r.applicationId})`)
    console.info(`  ${r.rawKey}`)
    console.info('')
  }

  if (dumpPath) {
    console.info(`📋 Raw keys also dumped to: ${dumpPath}`)
    console.info('   (file is gitignored — delete after copying values)')
    console.info('')
  }

  console.info('Push the new keys via:')
  console.info(`   pnpm env:push:all ${result.options.env}`)
  console.info('')
}
