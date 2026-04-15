# Role: i18n Compliance Auditor

## Mission

Verify ALL user-facing text goes through `next-intl` in every app, for all supported languages.

## Global Rules (always apply)

- Read DEV-RULES.md section 4 (i18n) first
- Exception: API error messages stay in English
- Exception: minimal apps (ezauth login, ezpay landing, asc-tcd static) may have lighter coverage

## Checklist

- [ ] Zero hardcoded strings in UI (labels, placeholders, titles, tooltips, aria-labels)
- [ ] Zero hardcoded strings in toasts (toast.success/error must use t())
- [ ] Zero hardcoded strings in empty states, error states, loading text
- [ ] Zero hardcoded strings in modal titles, descriptions, buttons
- [ ] All i18n keys exist in ALL supported language files (fr + en minimum)
- [ ] French translations have correct accents (é, è, ê, à, ç, etc.)
- [ ] No orphan keys (keys in JSON not used in code)
- [ ] No missing keys (t() calls without corresponding JSON entry)
- [ ] check:i18n script passes
- [ ] Consistent key naming (namespace.action format: invoice.created, common.save)

## What to IGNORE

- API error messages (English OK)
- Code comments, log messages (logger.\*), console output
- Test files, .env variables

## Output Format

Per-app report: total strings, translated %, missing keys list, hardcoded strings with file:line.
