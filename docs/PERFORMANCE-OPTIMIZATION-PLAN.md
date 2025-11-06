# ⚡ Performance Optimization Plan - Phase 3.2

**Target:** 82/100 → 95/100 (+13 points)
**Duration:** 8-10 hours
**Date:** November 6, 2025

---

## 📊 Current State Analysis

### Bundle Sizes (Last Build: Oct 2025)
| App | Total Static | Status | Priority |
|-----|--------------|--------|----------|
| EZStart | ~10MB ⬇️ | Optimized | ✅ Low |
| FengShui | ~50MB | Critical | 🔴 High |
| GreenPulse | ~45MB | Critical | 🔴 High |
| ASC-TCD | ~25MB | Poor | ❌ Medium |
| EZAuth | ~20MB | Poor | ❌ Medium |
| EZBill | Not analyzed | Unknown | ⚠️ Medium |
| EZPay | Not analyzed | Unknown | ⚠️ Low |
| Tower Defense | 3KB | Incomplete | ⚠️ Low |

### Images Analysis (Nov 6, 2025)
**Total PNG/JPG found:** 34.1MB across all apps

**Top 10 Largest Images:**
1. `lima-prod-mobile.png` - 4.3MB 🔴
2. `transplantation-arbres-mobile.png` - 3.9MB 🔴
3. `zephyrus-desktop.png` - 3.0MB 🔴
4. `fond-noisy.jpg` - 2.8MB (ASC-TCD) 🔴
5. `transplantation-arbres-desktop.png` - 2.5MB 🔴
6. `bergerac-2023-web.png` - 2.5MB (ASC-TCD) 🔴
7. `grass.png` - 1.9MB (Tower Defense) 🔴
8. `evento-app.io-desktop.png` - 1.9MB 🔴
9. `ez-tag.png` - 1.8MB 🔴
10. `logo.png` - 1.5MB (GreenPulse) 🔴

**Potential Savings:** 50-70% = 17-24MB saved

---

## 🎯 Optimization Strategy

### Phase 1: Bundle Analysis (1h) ✅ IN PROGRESS
- [x] Analyze current builds
- [x] Identify large images (34.1MB found)
- [ ] Run fresh build with ANALYZE=true
- [ ] Document bundle composition
- [ ] Identify heavy dependencies

### Phase 2: Code Splitting (2h)
**Target Apps:** FengShui, GreenPulse, ASC-TCD, EZAuth

**Strategy:**
1. **FengShui** (Priority: High)
   - Analysis components (~900 lines)
   - BaguaWheel component (SVG-heavy)
   - PDF generation logic
   - html2canvas lazy load

2. **GreenPulse** (Priority: High)
   - Form builder components
   - AI generation logic
   - Dashboard heavy components

3. **ASC-TCD** (Priority: Medium)
   - Gallery components
   - Image carousels
   - Event pages

4. **EZAuth** (Priority: Medium)
   - Authentication flows
   - Dashboard components

**Expected Impact:** -15-25MB total across 4 apps

### Phase 3: Tree Shaking (1h)
**Actions:**
1. Check for barrel file imports (index.ts)
2. Verify lucide-react imports (named imports only)
3. Optimize @ezstart/ui imports
4. Check for unused dependencies
5. Configure Next.js tree shaking

**Expected Impact:** -5-10MB

### Phase 4: Images Optimization (3h) 🎯 MAJOR IMPACT
**Sub-tasks:**

#### 4.1 Convert to WebP/AVIF (1.5h)
```bash
# Install sharp for image optimization
pnpm add -D sharp

# Script to convert all PNG/JPG to WebP
node scripts/convert-images-webp.js
```

**Target Images (Top 10):**
- EZStart: 10 images (19.5MB → ~3-5MB)
- ASC-TCD: 3 images (7.8MB → ~1-2MB)
- GreenPulse: 1 image (1.5MB → ~200KB)
- Tower Defense: 1 image (1.9MB → ~300KB)

**Expected Savings:** 30.7MB → 5-8MB = 22-25MB saved

#### 4.2 Next.js Image Component (1h)
- Replace all <img> with <Image>
- Add lazy loading
- Add blur placeholders
- Configure image domains
- Set optimal sizes

**Apps to update:**
1. EZStart (10 images)
2. ASC-TCD (3 images)
3. GreenPulse (1 image)
4. Tower Defense (1 image)

#### 4.3 Responsive Images (0.5h)
- Add srcset for responsive images
- Configure device sizes
- Add breakpoints

**Expected Impact:**
- 50-70% file size reduction
- Lazy loading = faster initial load
- Better mobile experience
- Improved LCP (Largest Contentful Paint)

### Phase 5: Verification & Documentation (1h)
1. Run Lighthouse audits (before/after)
2. Compare bundle sizes
3. Update PERFORMANCE-AUDIT.md
4. Update global scores
5. Create commits

---

## 📈 Expected Results

### Bundle Sizes After Optimization
| App | Before | After | Savings |
|-----|--------|-------|---------|
| FengShui | 50MB | ~15MB | -35MB (-70%) |
| GreenPulse | 45MB | ~12MB | -33MB (-73%) |
| ASC-TCD | 25MB | ~8MB | -17MB (-68%) |
| EZAuth | 20MB | ~7MB | -13MB (-65%) |
| **Total** | **150MB** | **~52MB** | **-98MB (-65%)** |

### Score Improvements
- **Performance:** 82/100 → 95/100 (+13 points) ✅
- **Global Score:** 96.6/100 → 97.4/100 (+0.8 points)
- **Excellence Rate:** 65% → 71% (12/17 audits ≥90)

### Core Web Vitals Impact
- **LCP (Largest Contentful Paint):** -30-50% improvement
- **FCP (First Contentful Paint):** -20-30% improvement
- **TBT (Total Blocking Time):** -15-25% improvement
- **CLS (Cumulative Layout Shift):** 0 (Image component prevents)

---

## 🔧 Implementation Order

### Day 1 (4-5h)
1. ✅ Bundle Analysis (1h)
2. Code Splitting Priority Apps (2h)
   - FengShui
   - GreenPulse
3. Images Conversion Script (1h)
4. Convert Top 10 Images (1h)

### Day 2 (4-5h)
1. Code Splitting Remaining Apps (1h)
   - ASC-TCD
   - EZAuth
2. Next.js Image Component Migration (2h)
3. Tree Shaking Optimization (1h)
4. Verification & Documentation (1h)

---

## 🚀 Quick Wins (Immediate Impact)

### 1. Convert Top 5 Images (30 min)
- lima-prod-mobile.png (4.3MB → ~600KB) = -3.7MB
- transplantation-arbres-mobile.png (3.9MB → ~550KB) = -3.35MB
- zephyrus-desktop.png (3.0MB → ~450KB) = -2.55MB
- fond-noisy.jpg (2.8MB → ~400KB) = -2.4MB
- transplantation-arbres-desktop.png (2.5MB → ~350KB) = -2.15MB

**Total Quick Win:** -14.15MB (47% of all images)

### 2. Dynamic Import Heavy Components (1h)
- FengShui AnalysisStep
- GreenPulse FormBuilder
- ASC-TCD Gallery

**Expected:** -10-15MB

### 3. Tree Shake lucide-react (30 min)
Check all imports are named imports:
```tsx
// ❌ Bad
import * as Icons from 'lucide-react'

// ✅ Good
import { Activity, AlertCircle } from 'lucide-react'
```

**Expected:** -1-2MB

---

## 📝 Success Criteria

- [ ] All apps < 15MB total static size
- [ ] Homepage bundles < 10KB (code-split)
- [ ] First Load JS < 200KB per route
- [ ] All images in WebP/AVIF format
- [ ] All images use Next.js Image component
- [ ] Lighthouse Performance Score > 90 on all apps
- [ ] LCP < 2.5s on 4G connection
- [ ] Performance audit updated: 82 → 95/100

---

## 🎯 Next Steps After This Phase

Once Performance hits 95/100, remaining opportunities:

1. **Security (85 → 95):** +10 points
2. **UX (96 → 100):** +4 points
3. **Mobile UX (93 → 98):** +5 points
4. **Dependencies (88 → 95):** +7 points

**Final Target:** 98-100/100 overall score
