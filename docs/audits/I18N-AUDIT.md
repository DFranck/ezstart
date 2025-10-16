# 🌐 Internationalization (i18n) Audit - @ezstart Monorepo

**Last Updated:** [DATE]
**Status:** 🔴 Not Audited

---

## 📋 Overview

Internationalization audit covering translation coverage, locale support, date/number formatting, and RTL support.

---

## 🗣️ Locale Support

### Supported Languages

**Current Implementation:**

| App | Framework | Locales | Default | Status |
|-----|-----------|---------|---------|--------|
| EZStart | next-intl | ? | ? | 🔴 |
| EZAuth | ? | ? | ? | 🔴 |
| EZBill | ? | ? | ? | 🔴 |
| EZPay | ? | ? | ? | 🔴 |
| FengShui | ? | ? | ? | 🔴 |
| Tower Defense | ? | ? | ? | 🔴 |
| ASC-TCD | ? | ? | ? | 🔴 |

**Check:**
```bash
# Find locale files
find apps -name "en.json" -o -name "fr.json" -o -name "messages"

# Check next-intl configuration
grep -r "next-intl\|NextIntlClientProvider" apps/*/web/src --include="*.tsx"

# Check i18n configuration
find . -name "i18n.ts" -o -name "i18n.config.*"
```

**Target Languages:**
- [ ] English (en) - Primary
- [ ] French (fr) - Quebec market
- [ ] Spanish (es) - US/LATAM market
- [ ] Chinese (zh) - Asian market
- [ ] Arabic (ar) - RTL testing

**Findings:**
- ❌ [Only EZStart has i18n, others hardcoded]
- ✅ [All apps support multiple locales]

---

## 📝 Translation Coverage

### String Extraction

**Hardcoded Strings:**
```bash
# Find hardcoded English strings in JSX
grep -r ">\s*[A-Z][a-z]*\s*<" apps/*/web/src --include="*.tsx" | grep -v "t(" | head -20

# Find hardcoded strings in buttons
grep -r "<Button.*>[A-Z]" apps/*/web/src --include="*.tsx" | grep -v "t("

# Find console.log with hardcoded strings
grep -r 'console\.(log|error|warn).*"[A-Z]' apps/*/web/src --include="*.ts" --include="*.tsx"
```

### Results by App

| App | Total Strings | Translated | % Coverage | Missing | Status |
|-----|---------------|------------|------------|---------|--------|
| EZStart | ? | ? | ?% | ? | 🔴 |
| EZAuth | ? | ? | ?% | ? | 🔴 |
| EZBill | ? | ? | ?% | ? | 🔴 |
| EZPay | ? | ? | ?% | ? | 🔴 |
| Tower Defense | ? | ? | ?% | ? | 🔴 |

**Coverage Target:** 100% of user-facing strings

**Findings:**
- ❌ [Many hardcoded strings, <50% coverage]
- ✅ [All strings translated, 100% coverage]

---

## 📁 Translation Files Structure

### File Organization

**Expected Structure:**
```
apps/[app]/web/messages/
├── en.json       # English (default)
├── fr.json       # French
├── es.json       # Spanish
└── zh.json       # Chinese
```

**Check:**
```bash
# Find translation files
find apps -type f \( -name "*.json" -o -name "*.yml" -o -name "*.yaml" \) -path "*/messages/*" -o -path "*/locales/*"

# Check translation file structure
cat apps/ezstart/web/messages/en.json 2>/dev/null | jq 'keys'
```

### Results

| App | Translation Files | Structure | Sync Status | Status |
|-----|-------------------|-----------|-------------|--------|
| EZStart | ? | ? | ? | 🔴 |
| EZAuth | ? | ? | ? | 🔴 |
| EZBill | ? | ? | ? | 🔴 |

**Translation Keys Structure:**
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "auth": {
    "login": "Log In",
    "logout": "Log Out",
    "register": "Sign Up"
  },
  "pages": {
    "home": {
      "title": "Welcome to EZStart",
      "subtitle": "Build faster with our monorepo"
    }
  }
}
```

**Findings:**
- ❌ [No translation files, or inconsistent structure]
- ✅ [Well-organized, namespaced keys]

---

## 🔤 Translation Quality

### Translation Completeness

**Missing Translations:**
```bash
# Find missing keys between locales
diff <(jq -r 'keys[]' apps/ezstart/web/messages/en.json) \
     <(jq -r 'keys[]' apps/ezstart/web/messages/fr.json)

# Find empty translations
grep -r '": ""' apps/*/web/messages/
```

**Consistency:**
- [ ] All locales have same keys
- [ ] No empty string values
- [ ] Pluralization handled (1 item vs 2 items)
- [ ] Variables/interpolation consistent

**Check:**
```typescript
// Example proper usage
t('invoice.count', { count: 5 }) // "5 invoices"
t('invoice.count', { count: 1 }) // "1 invoice"
```

### Results

| Locale | Keys | Empty Values | Missing Keys | Pluralization | Status |
|--------|------|--------------|--------------|---------------|--------|
| en | ? | ? | - | ? | 🔴 |
| fr | ? | ? | ? | ? | 🔴 |
| es | ? | ? | ? | ? | 🔴 |

**Findings:**
- ❌ [Many missing/empty translations]
- ✅ [Complete, high-quality translations]

---

## 📅 Date & Time Formatting

### Locale-aware Formatting

**Implementation:**
- [ ] Dates formatted with locale (en-US vs fr-FR)
- [ ] Times formatted with locale (12h vs 24h)
- [ ] Relative time (2 days ago, il y a 2 jours)
- [ ] Timezone support

**Check:**
```bash
# Find date formatting
grep -r "toLocaleDateString\|toLocaleTimeString\|Intl.DateTimeFormat" apps/*/web/src --include="*.ts" --include="*.tsx"

# Find date libraries
grep -r "date-fns\|dayjs\|moment" apps/*/web/package.json
```

**Examples:**
```typescript
// ❌ Wrong: Hardcoded format
const date = "12/31/2025" // Ambiguous, US-only

// ✅ Right: Locale-aware
const date = new Date().toLocaleDateString(locale, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
// en-US: "December 31, 2025"
// fr-FR: "31 décembre 2025"
```

### Results

| Category | Implementation | Locale-aware | Status |
|----------|----------------|--------------|--------|
| Date formatting | ? | ? | 🔴 |
| Time formatting | ? | ? | 🔴 |
| Relative time | ? | ? | 🔴 |
| Timezones | ? | ? | 🔴 |

**Findings:**
- ❌ [Hardcoded date formats]
- ✅ [Fully locale-aware formatting]

---

## 💰 Number & Currency Formatting

### Locale-aware Numbers

**Implementation:**
- [ ] Numbers formatted with locale (1,000.00 vs 1.000,00)
- [ ] Currency formatted with locale ($1,000 vs 1 000 $)
- [ ] Percentages formatted
- [ ] Large numbers abbreviated (1K, 1M)

**Check:**
```bash
# Find currency formatting
grep -r "Intl.NumberFormat\|currency" apps/*/web/src --include="*.ts" --include="*.tsx"

# Find hardcoded currency symbols
grep -r '\$[0-9]\|USD\|CAD' apps/*/web/src --include="*.tsx"
```

**Examples:**
```typescript
// ❌ Wrong: Hardcoded
const price = `$${amount}` // Only works for USD

// ✅ Right: Locale-aware
const price = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'USD'
}).format(amount)
// en-US: "$1,000.00"
// fr-FR: "1 000,00 $US"
```

### Results

| Category | Implementation | Locale-aware | Examples | Status |
|----------|----------------|--------------|----------|--------|
| Numbers | ? | ? | ? | 🔴 |
| Currency | ? | ? | ? | 🔴 |
| Percentages | ? | ? | ? | 🔴 |

**Findings:**
- ❌ [Hardcoded currency symbols, not locale-aware]
- ✅ [Proper Intl.NumberFormat usage]

---

## 🔄 RTL (Right-to-Left) Support

### RTL Languages

**Implementation:**
- [ ] RTL detection (Arabic, Hebrew)
- [ ] `dir="rtl"` attribute on `<html>`
- [ ] Mirrored layouts for RTL
- [ ] Icons/arrows reversed
- [ ] Text alignment correct

**Check:**
```bash
# Find RTL handling
grep -r 'dir=\|direction:\|rtl' apps/*/web/src --include="*.tsx" --include="*.css"

# Find Tailwind RTL utilities
grep -r 'ltr:\|rtl:' apps/*/web/src --include="*.tsx"
```

**Tailwind RTL Example:**
```tsx
// ✅ Proper RTL support
<div className="ltr:ml-4 rtl:mr-4">
  Content
</div>
```

### Results

| Feature | Implementation | Quality | Status |
|---------|----------------|---------|--------|
| RTL detection | ? | ? | 🔴 |
| Mirrored layouts | ? | ? | 🔴 |
| Reversed icons | ? | ? | 🔴 |
| Text alignment | ? | ? | 🔴 |

**Findings:**
- ❌ [No RTL support]
- ✅ [Full RTL support for Arabic/Hebrew]

---

## 🌍 URL & Routing

### Localized URLs

**Implementation:**
- [ ] Locale in URL (`/en/about`, `/fr/a-propos`)
- [ ] Language switcher preserves current page
- [ ] SEO-friendly localized URLs
- [ ] `hreflang` tags for SEO

**Check:**
```bash
# Find locale routing
grep -r "\[locale\]" apps/*/web/src/app

# Find language switcher
find apps/*/web/src -name "*LanguageSwitcher*" -o -name "*LocaleSwitcher*"

# Check middleware for locale detection
cat apps/*/web/src/middleware.ts 2>/dev/null | grep locale
```

**Next.js i18n Example:**
```typescript
// middleware.ts
import { createMiddleware } from 'next-intl/middleware'

export default createMiddleware({
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en'
})
```

### Results

| App | Localized URLs | Language Switcher | hreflang Tags | Status |
|-----|----------------|-------------------|---------------|--------|
| EZStart | ? | ? | ? | 🔴 |
| EZAuth | ? | ? | ? | 🔴 |
| EZBill | ? | ? | ? | 🔴 |

**Findings:**
- ❌ [No localized URLs, hardcoded English]
- ✅ [Full locale routing with switcher]

---

## 📧 Email & Notifications

### Localized Communications

**Implementation:**
- [ ] Emails sent in user's language
- [ ] Push notifications localized
- [ ] SMS messages localized
- [ ] Error messages localized

**Check:**
```bash
# Find email templates
find apps -name "*email*" -o -name "*Email*" -o -name "*mailer*"

# Check for localized email templates
find apps -path "*/emails/*" -name "*.tsx" -o -name "*.html"
```

### Results

| Type | Templates | Localized | Status |
|------|-----------|-----------|--------|
| Transactional emails | ? | ? | 🔴 |
| Marketing emails | ? | ? | 🔴 |
| Push notifications | ? | ? | 🔴 |
| SMS | ? | ? | 🔴 |

**Findings:**
- ❌ [All emails in English only]
- ✅ [Emails localized per user preference]

---

## 🛠️ i18n Infrastructure

### Tooling & Automation

**Translation Management:**
- [ ] Translation keys extracted automatically
- [ ] Missing translations detected in CI
- [ ] Translation platform integrated (Phrase, Lokalise)
- [ ] Translators can update without dev

**Check:**
```bash
# Find i18n scripts
cat package.json | jq '.scripts | to_entries[] | select(.key | contains("i18n"))'

# Check for translation extraction
find . -name "*extract*" -o -name "*translations*" | grep -E "script|tool"
```

**Recommended Scripts:**
```json
{
  "i18n:extract": "formatjs extract 'src/**/*.tsx' --out-file messages/en.json",
  "i18n:check": "node scripts/check-translations.js",
  "i18n:missing": "diff <(jq -r 'keys[]' en.json) <(jq -r 'keys[]' fr.json)"
}
```

### Results

- [ ] Automated extraction: ?
- [ ] CI checks: ?
- [ ] Translation platform: ?
- [ ] Translator access: ?

**Findings:**
- ❌ [Manual translations, no automation]
- ✅ [Automated workflow with platform]

---

## 🎯 Action Items

### Priority: 🔴 CRITICAL
- [ ] #1 Extract hardcoded strings in all apps
- [ ] #2 Setup next-intl for all web apps
- [ ] #3 Create translation files (en, fr minimum)

### Priority: 🟡 HIGH
- [ ] #4 Implement locale-aware date/currency formatting
- [ ] #5 Add language switcher to all apps
- [ ] #6 Setup translation CI checks

### Priority: 🟢 MEDIUM
- [ ] #7 Add RTL support (Arabic, Hebrew)
- [ ] #8 Localize emails and notifications
- [ ] #9 Integrate translation management platform

---

## 💡 Recommendations

### Short-term (This Month)
1. **Audit hardcoded strings**: Use grep to find all hardcoded text
2. **Setup next-intl**: Start with EZAuth, then expand
3. **Create en.json + fr.json**: Begin with critical strings

### Long-term (This Quarter)
1. **Add 3+ languages**: English, French, Spanish minimum
2. **Automate translations**: Integrate Phrase or Lokalise
3. **RTL support**: Test with Arabic locale
4. **Localize emails**: Create templates per language

### Best Practices
- **Never hardcode strings** in JSX
- **Namespace keys** (auth.login, not just login)
- **Use ICU message format** for plurals/variables
- **Test with pseudo-locale** (detect missing translations)
- **Locale-aware formatting** for dates/numbers/currency

---

## 📊 Final Score

**Total Score:** ?/100

**Breakdown:**
- Locale Support (15 pts): ?/15
- Translation Coverage (25 pts): ?/25
- Translation Quality (15 pts): ?/15
- Date/Time Formatting (10 pts): ?/10
- Number/Currency Formatting (10 pts): ?/10
- RTL Support (10 pts): ?/10
- URL Routing (10 pts): ?/10
- Infrastructure (5 pts): ?/5

**Status:**
- 🟢 90-100: Excellent
- 🟡 70-89: Good
- 🟠 50-69: Fair
- 🔴 0-49: Poor

---

**Next Audit:** [DATE + 3 months]
