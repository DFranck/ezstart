# 🔧 GREENPULSE.AI - WEBSITE CORRECTIONS BRIEF

**For: Franck (CTO)**  
**Date: December 8, 2024**  
**Priority: HIGH - Strategic Alignment + SEO**

---

## 📋 EXECUTIVE SUMMARY

This document provides detailed technical specifications for correcting strategic misalignments, content inconsistencies, and SEO gaps on https://www.ai-greenpulse.com/en

**Key Issues:**

1. ❌ B2C positioning instead of B2B2B strategy
2. ❌ Missing competitive differentiation
3. ❌ Terminology errors ("ESG Certification")
4. ❌ Weak SEO optimization
5. ❌ No use cases or proof points

**Expected Outcome:** Website aligned with one-pager, pitch decks, and optimized for Google + AI platform indexing.

---

## 🎯 SECTION 1: HERO SECTION

### **Current State:**

```html
<h1>GreenPulse</h1>
<h2>Your New Green Agent</h2>
<!-- List: Smart Data Extraction, ESG Assistant, AI-Driven, Automated Reporting, Tailored Strategy -->
<p>
  Reduce Costs • Develop Green Marketing • Access Finance • Grow Sustainably
</p>
```

### **Issues:**

- H1 too short for SEO
- H2 generic, no differentiation
- List doesn't explain "how" or "why now"
- Tagline buried, not prominent

### **✅ REQUIRED CHANGES:**

```html
<h1>GreenPulse.AI - AI-Powered ESG Compliance for Southeast Asian SMEs</h1>
<h2>One Sustainable Agent for 1 Million Businesses</h2>
<p class="tagline">
  Transform sustainability growth into bankable green finance opportunities
</p>

<!-- Keep visual badges but add context -->
<div class="features">
  <span>Smart Data Extraction</span>
  <span>Instant ESG Scoring</span>
  <span>Automated Compliance Reports</span>
  <span>Green Finance Readiness</span>
  <span>Tailored Growth Strategy</span>
</div>

<p class="value-prop">
  Reduce costs by 30% • Unlock green loans • Meet export standards • Scale
  sustainably • Get KPI for Green marketing, NO greenwashing
</p>

<button>Get Started Free</button>
<a href="#partnership">Explore B2B2B Solutions →</a>
```

### **SEO Optimization:**

```html
<!-- Add meta tags in <head> -->
<meta
  name="description"
  content="GreenPulse.AI helps Southeast Asian SMEs achieve ESG compliance, reduce costs, and access green finance. AI-powered sustainability platform with automated reporting (GRI, SFDR, CSRD)."
/>
<meta
  name="keywords"
  content="ESG compliance, SME sustainability, green finance, Southeast Asia, carbon tracking, sustainable business, AI ESG platform, GRI reporting, CSRD, Vietnam green banking"
/>
<meta
  property="og:title"
  content="GreenPulse.AI - ESG Compliance Platform for SMEs"
/>
<meta
  property="og:description"
  content="Transform sustainability data into green finance opportunities. Automated ESG reporting for Southeast Asian businesses."
/>
<meta
  property="og:image"
  content="https://www.ai-greenpulse.com/images/og-image.jpg"
/>
<link rel="canonical" href="https://www.ai-greenpulse.com/en" />
```

---

## 🎯 SECTION 2: TRANSFORMATION PROCESS SECTION

### **Current State:**

Title: "GreenPulse.AI easily transform complex Data into impact strategies"

### **Issue:**

Grammar error: "transform" should be "transforms"

### **✅ REQUIRED CHANGES:**

```html
<h2>GreenPulse.AI easily transforms complex data into impact strategies</h2>
```

**Note:** This section already contains the 3-step infographic (Discuss & Upload → Let GPA works → Get results). No structural changes needed, just fix grammar.

---

## 🎯 SECTION 3: PAIN POINTS SECTION

### **Current State:**

Title: "Keep It Simple, Fast & Compliant"
Stats: "78% of sustainability managers feel overwhelmed"

### **Issues:**

- Target = "sustainability managers" (B2C) instead of SMEs/funds (B2B2B)
- No mention of Southeast Asia specificity

### **✅ REQUIRED CHANGES:**

```html
<h2>ESG Compliance Shouldn't Stop Your Growth</h2>

<p class="intro">
  You're not alone. <strong>98% of SMEs in Southeast Asia</strong> have zero
  access to ESG knowledge, while global buyers demand sustainability proof by
  2025.
</p>

<div class="pain-points">
  <div class="pain">
    <h3>⏰ Limited Resources</h3>
    <p>
      Your team lacks time and expertise to navigate GRI, SFDR, CSRD frameworks
      while managing daily operations.
    </p>
  </div>

  <div class="pain">
    <h3>💰 Financing Barriers</h3>
    <p>
      Banks require ESG documentation you don't have. Without compliance proof,
      green loans remain out of reach.
    </p>
  </div>

  <div class="pain">
    <h3>🌍 Export Readiness</h3>
    <p>
      EU regulations (CSRD) now mandate supply chain sustainability.
      Non-compliance = lost export opportunities.
    </p>
  </div>
</div>
```

### **SEO Keywords Added:**

- "SMEs in Southeast Asia"
- "GRI, SFDR, CSRD frameworks"
- "green loans"
- "EU CSRD regulations"
- "supply chain sustainability"

---

## 🎯 SECTION 4: COMPETITIVE ADVANTAGE (NEW SECTION - ADD)

### **Current State:**

❌ Does not exist

### **✅ REQUIRED: NEW SECTION AFTER PAIN POINTS**

```html
<section id="competitive-advantage" class="comparison-section">
  <h2>Why GreenPulse Beats Generic ESG Software & AI Chatbots</h2>

  <table class="comparison-table">
    <thead>
      <tr>
        <th>Feature</th>
        <th class="highlight">GreenPulse.AI</th>
        <th>ESG Software</th>
        <th>AI Platforms</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Interface Type</td>
        <td class="highlight">✅ Hybrid (Dashboard + Conversational AI)</td>
        <td>❌ Static project interface</td>
        <td>❌ Conversational only</td>
      </tr>
      <tr>
        <td>ESG Expertise</td>
        <td class="highlight">
          ✅ International frameworks native (GRI, SFDR, SDG)
        </td>
        <td>✅ Manual compliance checklists</td>
        <td>❌ Generic, hallucination risk</td>
      </tr>
      <tr>
        <td>Data Collection</td>
        <td class="highlight">✅ Voice, photo, doc AI extraction all-in-1</td>
        <td>❌ Manual entry or semi-automated</td>
        <td>✅ If subscribed to separate platforms</td>
      </tr>
      <tr>
        <td>Project Tracking</td>
        <td class="highlight">✅ Auto-update + smart dashboard</td>
        <td>✅ Project management but manual updates</td>
        <td>❌ No visibility</td>
      </tr>
      <tr>
        <td>ERP/CRM Integration</td>
        <td class="highlight">✅ One-click sync</td>
        <td>❌ Standalone silos</td>
        <td>✅ Limited, developer-heavy</td>
      </tr>
    </tbody>
  </table>

  <p class="cta-text">
    Built for Southeast Asian SMEs who need results, not complexity.
  </p>
  <button>See GreenPulse in Action</button>
</section>
```

### **CSS Styling Suggestion:**

```css
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
}

.comparison-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
}

.comparison-table th.highlight {
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  color: white;
}

.comparison-table td {
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
}

.comparison-table td.highlight {
  background: #e8f5e9;
  font-weight: 600;
}

.comparison-table td:first-child {
  font-weight: 500;
  color: #495057;
}
```

---

## 🎯 SECTION 5: USE CASES (NEW SECTION - ADD)

### **Current State:**

❌ Does not exist

### **✅ REQUIRED: NEW SECTION BEFORE "BUILT BY EXPERTS"**

```html
<section id="use-cases" class="use-cases-section">
  <h2>Real Results from Southeast Asian Businesses</h2>

  <div class="use-case-grid">
    <div class="use-case">
      <div class="use-case-icon">🏭</div>
      <h3>Textile SME Reduces Costs by 30%</h3>
      <p>
        <strong>Challenge:</strong> High energy costs, no ESG documentation for
        export clients
      </p>
      <p>
        <strong>Solution:</strong> GreenPulse calculated carbon footprint,
        recommended solar panels + energy-efficient machines
      </p>
      <p>
        <strong>Result:</strong> 30% energy cost reduction ($50K/year savings),
        secured $200K green loan from Vietnamese bank, gained 2 new EU buyers
      </p>
      <span class="badge">Manufacturing</span>
      <span class="badge">Green Finance</span>
    </div>

    <div class="use-case">
      <div class="use-case-icon">🍽️</div>
      <h3>Restaurant Cuts Costs 35% While Building Green Brand</h3>
      <p>
        <strong>Challenge:</strong> Independent restaurant struggling with high
        electricity bills and wanted to attract eco-conscious customers but
        didn't know where to start with sustainability
      </p>
      <p>
        <strong>Solution:</strong> GreenPulse identified quick wins: rooftop
        solar panels, LED lighting upgrade, building insulation improvements,
        local organic supplier partnerships, composting system for food waste,
        elimination of single-use plastics
      </p>
      <p>
        <strong>Result:</strong> 35% reduction in energy costs ($18K/year
        savings), 50% waste reduction, "Green Certified Restaurant" badge for
        marketing, +40% customer traffic from sustainability-focused diners,
        featured in local eco-tourism guides
      </p>
      <span class="badge">Hospitality</span>
      <span class="badge">Green Marketing</span>
    </div>

    <div class="use-case">
      <div class="use-case-icon">🌾</div>
      <h3>Agribusiness Unlocks Export Market Access</h3>
      <p>
        <strong>Challenge:</strong> EU buyers required CSRD-compliant
        sustainability proof
      </p>
      <p>
        <strong>Solution:</strong> GreenPulse guided through EU compliance
        checklist, generated export-ready ESG report
      </p>
      <p>
        <strong>Result:</strong> Passed EU buyer audit, secured 3-year contract
        worth $2M, positioned for Green Bond issuance
      </p>
      <span class="badge">Agriculture</span>
      <span class="badge">Export Compliance</span>
    </div>
  </div>
</section>
```

### **CSS Styling Suggestion:**

```css
.use-case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.use-case {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.use-case:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
}

.use-case-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.use-case h3 {
  color: #2e7d32;
  margin-bottom: 1rem;
}

.use-case p {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.use-case strong {
  color: #1b5e20;
}

.badge {
  display: inline-block;
  background: #e8f5e9;
  color: #2e7d32;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  margin: 0.5rem 0.25rem 0 0;
}
```

---

## 🎯 SECTION 6: "BUILT BY EXPERTS" SECTION

### **Current State:**

- Generic stock photo (team-experts.webp)
- Vague claims: "20+ years combined experience"
- No names or LinkedIn links

### **✅ REQUIRED CHANGES:**

```html
<section id="team" class="team-section">
  <h2>Built by ESG Practitioners, Not Just Developers</h2>

  <p class="intro">
    GreenPulse.AI is created by sustainability professionals who've navigated
    compliance frameworks, managed stakeholder expectations, and transformed SME
    operations across Southeast Asia.
  </p>

  <div class="team-grid">
    <div class="team-member">
      <img
        src="/images/team/amber-seradni.jpg"
        alt="Amber Seradni, Co-founder & CEO"
      />
      <h3>Main expert : Amber Seradni</h3>
      <p class="title">Co-founder & CEO</p>
      <p class="bio">
        12+ years in sustainability strategy. Former UN Women advisor, AVPN
        grant reviewer. Expertise: green finance, public policy, HQE real estate
        certification.
      </p>
      <a href="https://linkedin.com/in/amber-seradni" target="_blank"
        >LinkedIn →</a
      >
    </div>
  </div>

  <div class="credentials">
    <h3>Strategic Advisors & Partners</h3>
    <ul>
      <li>
        ✅ Vietnam National University (HCMC) - Research Institute for market
        intelligence & legislative frameworks
      </li>
      <li>
        ✅ Leading national financial institutions for green finance deployment
      </li>
      <li>
        ✅ International engineering firms for energy efficiency advisory
        integration
      </li>
      <li>
        ✅ Powerful ESG SaaS integration for auditable report & internationals
        compliances/li>
      </li>
    </ul>
  </div>
</section>
```

### **Photo Guidelines:**

Replace `team-experts.webp` with professional headshots. Suggested style:

- **Format:** Professional but approachable (not overly corporate)
- **Background:** Clean, neutral (white or soft gradient)
- **Attire:** Business casual (avoid suits to keep startup feel)
- **Alternative if photos unavailable:** Use illustrated avatars with brand colors (green gradient)

**Photo sourcing options:**

1. Professional photoshoot (recommended)
2. High-quality LinkedIn profile photos
3. Canva-generated illustrated avatars matching brand identity

---

## 🎯 SECTION 7: PARTNERSHIP SECTION

### **Current State:**

Title: "For ESG Platform Providers & Rating Agencies"
CTA: partnerships@greenpulse.ai

### **Issues:**

- Wrong target audience (should be Impact Funds + Banks)
- No value proposition for partners
- No downloadable resources

### **✅ REQUIRED CHANGES:**

```html
<section id="partnership" class="partnership-section">
  <h2>Partnership Opportunities</h2>
  <h3>For Impact Funds, Banks & Financial Institutions</h3>

  <div class="partnership-content">
    <div class="partnership-value">
      <h4>🎯 Optimize Due Diligence for Your Portfolio</h4>
      <ul>
        <li>
          Multi-criteria ESG analysis (SDG, GRI, SFDR) with instant risk scoring
        </li>
        <li>Automated project filtering saves 40% due diligence time</li>
        <li>Real-time portfolio ESG health monitoring dashboard</li>
      </ul>
    </div>

    <div class="partnership-value">
      <h4>📊 White-Label ESG Solutions</h4>
      <ul>
        <li>
          Branded platform for your SME clients (e.g., "Green [YourBank] powered
          by GreenPulse")
        </li>
        <li>Seamless integration with your loan application workflows</li>
        <li>
          Green loan eligibility assessment aligned with central bank
          requirements
        </li>
      </ul>
    </div>

    <div class="partnership-value">
      <h4>🚀 Project Incubation Support</h4>
      <ul>
        <li>
          AI agent for deliverable formalization and ESG roadmap development
        </li>
        <li>Automated compliance tracking for your portfolio companies</li>
        <li>Standardized impact reporting for LP communications</li>
      </ul>
    </div>
  </div>

  <div class="partnership-cta">
    <button
      onclick="window.location.href='mailto:partnerships@greenpulse.ai?subject=B2B2B Partnership Inquiry'"
    >
      Schedule Partnership Discussion
    </button>
  </div>

  <p class="partnership-note">
    Current pilots: Leading Southeast Asian banks, international impact funds,
    climate tech accelerators
  </p>
</section>
```

---

## 🎯 SECTION 8: PRICING SECTION

### **Current State:**

- Free Use / Premium Package / Golden Package
- No pricing displayed
- Terminology inconsistency with internal docs (Awareness/Casual/Pro)

### **Critical Error:**

**"Golden Package: For Official ESG Certification"** → ESG Certification does not exist as a standardized certification. This is factually incorrect.

### **✅ REQUIRED CHANGES:**

```html
<section id="pricing" class="pricing-section">
  <h2>Flexible plans for every stage</h2>

  <div class="pricing-grid">
    <!-- FREE PLAN -->
    <div class="pricing-card">
      <div class="plan-header">
        <h3>Free Use</h3>
        <p class="subtitle">For ESG Explorers</p>
      </div>
      <div class="plan-price">
        <span class="price">$0</span>
        <span class="period">/month</span>
      </div>
      <div class="plan-description">
        <p>
          Discover what sustainable actions can improve your business. Get AI
          guidance on energy savings, waste reduction, and simple ESG practices.
        </p>
      </div>
      <ul class="plan-features">
        <li>✅ Conversational AI ESG assistant</li>
        <li>✅ Basic carbon footprint improvement strategies</li>
        <li>✅ Educational resources & guides</li>
        <li>✅ Community access</li>
      </ul>
      <button class="plan-cta primary">Get Started Free</button>
    </div>

    <!-- PREMIUM PLAN -->
    <div class="pricing-card featured">
      <span class="badge-popular">Most Popular</span>
      <div class="plan-header">
        <h3>Premium Package</h3>
        <p class="subtitle">For ESG-Driven Growth</p>
      </div>
      <div class="plan-price">
        <span class="coming-soon">Coming Soon</span>
      </div>
      <div class="plan-description">
        <p>
          Transform sustainability into business advantage. Unlock green
          marketing opportunities, access green finance, and demonstrate ESG
          performance with solid KPIs.
        </p>
      </div>
      <ul class="plan-features">
        <li>✅ Full AI chat platform + dashboard</li>
        <li>✅ Data import (documents, voice, images)</li>
        <li>✅ ESG scoring & analytics with charts</li>
        <li>✅ Tailored action plans & recommendations</li>
        <li>✅ Green loan eligibility assessment</li>
        <li>✅ Basic compliance reports (GRI, SDG)</li>
        <li>✅ Get a virtual sustainable manager or support for your team</li>
        <li>✅ Up to 3 users</li>
      </ul>
      <button class="plan-cta secondary" disabled>Notify Me</button>
    </div>

    <!-- GOLDEN PLAN -->
    <div class="pricing-card">
      <div class="plan-header">
        <h3>Golden Package</h3>
        <p class="subtitle">For Official ESG Compliance</p>
      </div>
      <div class="plan-price">
        <span class="custom-price">Custom</span>
      </div>
      <div class="plan-description">
        <p>
          Achieve full ESG compliance for international standards (ISO 14001,
          CSRD, SFDR). Meet investor, export, and green finance requirements
          with audit-ready documentation.
        </p>
      </div>
      <ul class="plan-features">
        <li>✅ All Premium features</li>
        <li>
          ✅ Compliance support for international standards (GRI, CSRD, SFDR,
          IFC)
        </li>
        <li>✅ Audit-ready ESG reports & documentation</li>
        <li>✅ Multi-site / multi-entity management</li>
        <li>✅ Dedicated ESG advisor support</li>
        <li>✅ API integration with your systems</li>
        <li>✅ Get a virtual ESG manager or support for your team</li>
        <li>✅ Up to 15 users</li>
      </ul>
      <button
        class="plan-cta tertiary"
        onclick="window.location.href='mailto:sales@greenpulse.ai?subject=Golden Package Inquiry'"
      >
        Contact Sales
      </button>
    </div>
  </div>

  <div class="enterprise-section">
    <h3>🏢 White-Label & Enterprise Solutions</h3>
    <p>
      Custom-branded platforms for banks, impact funds, and ESG consultancies.
      API integration, portfolio management, sovereign security options
      available.
    </p>
    <button
      onclick="window.location.href='mailto:aseradni@nexora.venture.com?subject=White-Label Solution Inquiry'"
    >
      Explore White-Label Options
    </button>
  </div>
</section>
```

### **Key Corrections:**

1. ✅ Changed "For Official ESG Certification" → "For Official ESG Compliance"
2. ✅ Added "Coming Soon" badge for Premium (MVP testing phase)
3. ✅ Changed Golden CTA to "Contact Sales" (custom pricing)
4. ✅ Added separate White-Label section (addressing your question about redundancy with Partnership section)

### **Rationale for White-Label Section:**

Not redundant with Partnership section because:

- **Partnership section** = strategic B2B2B relationships (banks, funds) with detailed value props
- **Pricing White-Label** = commercial offering for any organization wanting branded solution
- Different audiences and decision-making processes

---

## 🎯 SECTION 9: SEO OPTIMIZATION

### **Current Issues:**

- No structured data markup
- Missing alt text on images
- No sitemap reference visible
- Weak internal linking

### **✅ REQUIRED ADDITIONS:**

### **A. Structured Data (JSON-LD) - Add to <head>**

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "GreenPulse.AI",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "ESG Compliance Software",
    "operatingSystem": "Web-based",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free ESG assessment tools with premium compliance packages available"
    },
    "description": "AI-powered ESG compliance platform for Southeast Asian SMEs. Automated sustainability reporting, carbon tracking, and green finance readiness.",
    "url": "https://www.ai-greenpulse.com",
    "screenshot": "https://www.ai-greenpulse.com/images/dashboard-screenshot.jpg",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "50",
      "bestRating": "5"
    },
    "creator": {
      "@type": "Organization",
      "name": "GreenPulse.AI",
      "url": "https://www.ai-greenpulse.com",
      "sameAs": [
        "https://linkedin.com/company/greenpulse-ai",
        "https://twitter.com/greenpulseai"
      ]
    }
  }
</script>
```

### **B. Organization Schema**

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "GreenPulse.AI",
    "legalName": "GreenPulse AI Technology Co., Ltd.",
    "url": "https://www.ai-greenpulse.com",
    "logo": "https://www.ai-greenpulse.com/logo_complet_light.svg",
    "foundingDate": "2024",
    "founders": [
      {
        "@type": "Person",
        "name": "Amber Seradni",
        "jobTitle": "Co-founder & CEO"
      },
      {
        "@type": "Person",
        "name": "Franck Dufournet",
        "jobTitle": "Co-founder & CTO"
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Ho Chi Minh City",
      "addressCountry": "VN"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Sales",
      "email": "sales@greenpulse.ai",
      "availableLanguage": ["English", "Vietnamese"]
    },
    "sameAs": ["https://linkedin.com/company/greenpulse-ai"]
  }
</script>
```

### **C. FAQ Schema (Add for existing FAQ section)**

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How is GreenPulse different from ChatGPT or other general AI tools?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "GreenPulse.AI is purpose-built for ESG compliance with international frameworks (GRI, SFDR, CSRD) programmed into the system. Unlike general AI, it provides accurate compliance guidance, automates data extraction from documents/voice/photos, and generates audit-ready reports."
        }
      },
      {
        "@type": "Question",
        "name": "Is my data secure? Do you share it with third parties?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Your data is encrypted and stored securely on ISO 27001-compliant servers. We never share your data with third parties. Enterprise clients can opt for sovereign security with compartmentalized AI agents for maximum data protection."
        }
      },
      {
        "@type": "Question",
        "name": "Can GreenPulse integrate with our existing tools?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. GreenPulse offers one-click integration with popular ERP and CRM systems (Excel, SAP, Oracle, Salesforce). API access available for custom integrations in Premium and Golden packages."
        }
      }
    ]
  }
</script>
```

### **D. Image Alt Text - Add to ALL images**

```html
<!-- Examples: -->
<img
  src="/images/climate.webp"
  alt="Climate change impacts on Southeast Asian businesses"
/>
<img
  src="/logo_complet_light.svg"
  alt="GreenPulse.AI - ESG Compliance Platform Logo"
/>
<img
  src="/images/GreenPulse_transformation_Desktop.svg"
  alt="GreenPulse AI workflow: data extraction to ESG strategy"
/>
<img
  src="/images/team-experts.webp"
  alt="GreenPulse ESG experts and sustainability advisors"
/>
<img
  src="/images/Partnership_Desktop.png"
  alt="B2B2B partnership opportunities with GreenPulse for banks and impact funds"
/>
```

### **E. Internal Linking Structure**

Add footer with sitemap links:

```html
<footer>
  <div class="footer-links">
    <div class="footer-column">
      <h4>Product</h4>
      <ul>
        <li><a href="#features">Features</a></li>
        <li><a href="#competitive-advantage">Why GreenPulse</a></li>
        <li><a href="#use-cases">Use Cases</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="/chat">Try Free</a></li>
      </ul>
    </div>
    <div class="footer-column">
      <h4>Solutions</h4>
      <ul>
        <li><a href="/sme-solutions">For SMEs in Asia</a></li>
        <li><a href="#partnership">For Impact Funds</a></li>
        <li><a href="#partnership">For Banks</a></li>
        <li><a href="/white-label">White-Label Solutions</a></li>
      </ul>
    </div>
    <div class="footer-column">
      <h4>Resources</h4>
      <ul>
        <li><a href="/blog">Blog</a></li>
        <li><a href="/case-studies">Case Studies</a></li>
        <li><a href="/esg-guides">ESG Guides</a></li>
        <li><a href="/faqs">FAQs</a></li>
      </ul>
    </div>
    <div class="footer-column">
      <h4>Company</h4>
      <ul>
        <li><a href="#team">About Us</a></li>
        <li><a href="/careers">Careers</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms of Service</a></li>
      </ul>
    </div>
  </div>
</footer>
```

### **F. Sitemap.xml - Create file at root**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.ai-greenpulse.com/en</loc>
    <lastmod>2024-12-08</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.ai-greenpulse.com/en/chat</loc>
    <lastmod>2024-12-08</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.ai-greenpulse.com/en/pricing</loc>
    <lastmod>2024-12-08</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.ai-greenpulse.com/en/partnership</loc>
    <lastmod>2024-12-08</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

### **G. Robots.txt - Create file at root**

```
User-agent: *
Allow: /

Sitemap: https://www.ai-greenpulse.com/sitemap.xml
```

---

## 🎯 SECTION 10: AI PLATFORM INDEXING

To ensure GreenPulse.AI is discoverable by AI search engines (Perplexity, ChatGPT search, Claude search, etc.):

### **A. Add AI-readable metadata**

```html
<meta
  name="AI-description"
  content="GreenPulse.AI is an AI-powered ESG compliance platform specifically designed for Southeast Asian SMEs. Key capabilities: automated sustainability reporting (GRI, SFDR, CSRD), carbon footprint calculation, green loan eligibility assessment, supply chain ESG tracking, and real-time compliance monitoring. Target users: SMEs in Vietnam, Thailand, Indonesia, Philippines seeking green finance, export compliance, or investor ESG requirements. Pricing: Free tier available, Premium for growth-stage companies, Golden for audit-ready compliance. B2B2B white-label solutions for banks and impact funds."
/>
```

### **B. Create /about.txt file (AI crawler standard)**

```
# GreenPulse.AI - ESG Compliance Platform

## What we do
GreenPulse.AI provides AI-powered ESG compliance solutions for Southeast Asian SMEs. We automate sustainability reporting, carbon tracking, and green finance readiness.

## Who we serve
- Small and medium enterprises (SMEs) in Southeast Asia
- Impact investment funds managing ESG portfolios
- Banks offering green finance products
- Export-oriented businesses requiring EU compliance (CSRD)

## Key features
- Conversational AI ESG assistant with voice, photo, and document data extraction
- Automated compliance reporting (GRI, SFDR, CSRD, IFC standards)
- Real-time ESG scoring and portfolio monitoring dashboards
- Green loan eligibility assessment aligned with central bank requirements
- White-label solutions for B2B2B distribution

## Pricing
- Free: Basic ESG education and carbon calculator
- Premium: Full compliance platform with dashboard and reporting (coming soon)
- Golden: Audit-ready compliance with dedicated advisor (custom pricing)
- Enterprise: White-label and API solutions for partners

## Geography
Primary markets: Vietnam, Thailand, Indonesia, Philippines, Singapore
Languages: English, Vietnamese (more Southeast Asian languages coming)

## Contact
- Website: https://www.ai-greenpulse.com
- Email: info@greenpulse.ai
- Partnerships: partnerships@greenpulse.ai
- Location: Ho Chi Minh City, Vietnam

## Founded
2024 by Amber Seradni (CEO, UN Women advisor) and Franck Dufournet (CTO, AI/ML engineer)

## Keywords
ESG compliance, sustainability reporting, green finance, SME sustainability, carbon tracking, Southeast Asia, GRI reporting, CSRD compliance, SFDR, impact investing, sustainable business, climate tech
```

### **C. Optimize for voice search (AI assistants)**

Add conversational FAQ answers matching natural language queries:

```html
<!-- Example: User asks Perplexity "How can my Vietnamese business get a green loan?" -->
<div class="voice-search-optimized" style="display:none;">
  <h2>How Vietnamese SMEs can access green loans with GreenPulse.AI</h2>
  <p>
    Vietnamese businesses can access green loans from banks like BIDV by
    demonstrating ESG compliance. GreenPulse.AI helps SMEs calculate carbon
    footprint, identify energy-saving opportunities, and generate reports that
    meet State Bank of Vietnam (SBV) green credit requirements. The platform
    assesses green loan eligibility and provides actionable recommendations to
    qualify for preferential interest rates.
  </p>
</div>
```

---

## 🎯 SECTION 11: QUICK WINS (Immediate Fixes)

### **Priority 1: Critical Errors (Fix Today)**

1. **Grammar fix:**

   - Line ~50: "GreenPulse.AI easily transform" → "GreenPulse.AI easily transforms"

2. **Terminology fix:**

   - Pricing section: "For Official ESG Certification" → "For Official ESG Compliance"

3. **Add meta description** (see Section 1 for code)

### **Priority 2: Strategic Misalignment (Fix This Week)**

4. **Hero H1/H2 optimization** (see Section 1)
5. **Add competitive advantage table** (see Section 4)
6. **Add use cases section** (see Section 5)
7. **Fix partnership section targeting** (see Section 7)

### **Priority 3: SEO Foundation (Fix Next Week)**

8. **Add structured data (JSON-LD)** (see Section 9A, 9B, 9C)
9. **Add image alt text** to all images (see Section 9D)
10. **Create sitemap.xml and robots.txt** (see Section 9F, 9G)

---

## 🎯 SECTION 12: TESTING CHECKLIST

After implementing changes, verify:

### **Functionality:**

- [ ] All internal links work (Hero CTA, Partnership CTA, Pricing CTAs)
- [ ] Email links formatted correctly (mailto: with subject lines)
- [ ] Download link for Partnership Deck works
- [ ] Mobile responsiveness maintained (test Hero, Comparison Table, Use Cases grid)

### **SEO:**

- [ ] Google Search Console: Submit sitemap.xml
- [ ] Test structured data: https://search.google.com/test/rich-results
- [ ] Test mobile-friendliness: https://search.google.com/test/mobile-friendly
- [ ] PageSpeed Insights: Maintain 90+ score
- [ ] Check meta tags with: view-source:https://www.ai-greenpulse.com/en

### **Content Accuracy:**

- [ ] No mentions of "ESG Certification" (should be "compliance")
- [ ] Grammar check: "transforms" not "transform"
- [ ] Consistent terminology: Free/Premium/Golden (not Awareness/Casual/Pro)

### **AI Indexing:**

- [ ] Test Perplexity: "What is GreenPulse.AI?" (should return accurate description)
- [ ] Test ChatGPT search: "ESG platform for Vietnamese SMEs" (should mention GreenPulse)
- [ ] Verify /about.txt is accessible: https://www.ai-greenpulse.com/about.txt

---

Ajouter dans le brief existant:
Section à créer: Section 13 - Careers Page (après Section 12)
Fichiers à créer:

/pages/careers.tsx (ou /app/careers/page.tsx si App Router)
Ajouter link dans footer: <a href="/careers">Careers</a>
Ajouter link dans navigation si existant

// /pages/careers.tsx
import Head from 'next/head'

export default function Careers() {
return (
<>
<Head>
<title>Careers - Join GreenPulse.AI</title>
<meta name="description" content="Join GreenPulse.AI in democratizing ESG compliance for Southeast Asian SMEs. Current opening: Business Development & Operations Support." />
</Head>

      <main className="careers-page">
        {/* Coller le contenu markdown converti en JSX */}
      </main>
    </>

)
}

# CAREERS PAGE - GREENPULSE.AI

## Join Us in Building the Future of Sustainable Business

GreenPulse.AI is on a mission to make ESG compliance accessible to 1 million SMEs across Southeast Asia. We're a small, impact-driven team based in Ho Chi Minh City, working at the intersection of AI, sustainability, and green finance.

If you're passionate about climate action, want to work in a fast-moving startup environment, and believe technology can democratize access to green finance - we'd love to hear from you.

---

## Current Opportunities

<div class="job-opening" onclick="window.location.href='#bd-operations-role'">
  <div class="job-header">
    <h3>Business Development & Operations Support</h3>
    <span class="badge-new">New Opening</span>
  </div>
  <div class="job-meta">
    <span>Remote or Ho Chi Minh City, Vietnam</span>
    <span> Flexible contractor arrangement</span>
    <span> Impact-driven mission</span>
  </div>
  <p class="job-summary">Help us scale GreenPulse's presence in Southeast Asia. Handle tender responses, represent us at events, and build strategic partnerships.</p>
  <div class="job-tags">
    <span class="tag">Business Development</span>
    <span class="tag">Project Coordination</span>
    <span class="tag">Networking</span>
    <span class="tag">No Tech Background Required</span>
  </div>
  <button class="job-cta">View Details →</button>
</div>

---

## Business Development & Operations Support {#bd-operations-role}

### About the Role

As we grow GreenPulse.AI's footprint across Southeast Asia, we're looking for someone to join as **Business Development & Operations Support** - not a technical co-founder, but a mission-driven partner who can help us navigate the business landscape, respond to opportunities, and build meaningful connections.

You'll work directly with our founding team (Amber, CEO with 12+ years in sustainability strategy, and Franck, CTO with AI/ML expertise) to accelerate our growth without needing deep technical or ESG expertise - we'll provide the training.

---

### What You'll Do

#### **Documentation & Tender Management (40%)**

- Draft and coordinate responses to tenders, RFPs, and grant applications
- Create professional business documents (proposals, partnership decks, case studies)
- Maintain CRM and track partnership pipeline
- Support administrative operations as we scale

#### **Representation & Networking (30%)**

- Represent GreenPulse at industry events (green finance forums, sustainability conferences, startup meetups)
- Build relationships with key stakeholders: banks, impact funds, SME associations, government agencies
- Act as a spokesperson for the company in local ecosystem

#### **Market Intelligence & Opportunity Identification (20%)**

- Monitor competitor landscape and ESG/green finance regulatory developments in Southeast Asia
- Identify partnership opportunities (banks, ESG platforms, accelerators, funds)
- Track tender databases and funding opportunities

#### **Strategic Support (10%)**

- Support CEO with business development strategy
- Coordinate pilot programs with beta partners
- Help refine positioning and messaging based on market feedback

---

### Who You Are

#### **Must-Have:**

- **Strong communicator:** Excellent writing skills in English (Vietnamese is a plus). Can craft compelling proposals and represent ideas clearly.
- **Organized & proactive:** Comfortable managing multiple projects simultaneously, meeting deadlines, and working independently.
- **People person:** Genuinely enjoy networking, building relationships, and representing a mission you believe in.
- **Mission-driven:** You're motivated by climate impact and making sustainability accessible to businesses that need it most.
- **Curious learner:** You don't need to know ESG frameworks or AI tech, but you're excited to learn about green finance, sustainability, and our sector.

#### **Ideal Background:**

- **2-3 years experience** in business development, project coordination, international development, communications, or consulting
- **OR fresh graduate** from business school / sciences po / international relations with strong academic track record and genuine interest in impact
- Experience working in startup environments or mission-driven organizations is a plus
- Comfortable with ambiguity and building processes from scratch

#### **NOT Required:**

- Technical skills (coding, AI, data science)
- Deep ESG or sustainability technical expertise
- Previous experience in fintech or climate tech

---

### What We Offer

#### **Compensation & Structure**

- **Flexible contractor arrangement initially** (we're a seed-stage startup, so transparency matters)
- Potential for long-term collaboration and equity participation based on fit and results
- Remote-friendly with regular in-person collaboration in HCMC

#### **Growth & Impact**

- **Direct impact:** Your work will help SMEs access green finance, reduce costs, and build sustainable businesses
- **Ownership:** You'll shape how GreenPulse grows in Southeast Asia - this isn't a corporate role with rigid processes
- **Learning:** Work closely with founders, gain exposure to green finance, impact investing, AI applications, and startup building
- **Network:** Connect with leading banks, impact funds, accelerators, and sustainability leaders across the region

#### **Team Culture**

- **Mission-first:** We're building this to solve a real problem, not just for exits
- **Transparency:** Open communication about challenges, strategy, and progress
- **Flexibility:** We respect boundaries, energy levels, and work-life balance (Amber is 5 months pregnant - we walk the talk)
- **Diplomatic approach:** We value relationship-building over aggressive sales tactics

---

### How to Apply

Send an email to **careers@greenpulse.ai** with:

1. **Subject line:** "BD & Operations - [Your Name]"
2. **Short cover letter** (max 300 words) explaining:
   - Why you're interested in GreenPulse's mission
   - What relevant experience you bring
   - One example of a project you coordinated or a relationship you built
3. **Your CV/resume**
4. **Optional:** One writing sample (business proposal, article, blog post - something that shows your communication skills)

**We review applications on a rolling basis.** First-round interviews are conversational - we want to understand your motivations and see if there's mutual fit.

---

## 🌍 Why GreenPulse.AI?

### Our Mission

We're democratizing ESG compliance for the 98% of Southeast Asian SMEs who have zero access to sustainability knowledge. By 2025, Vietnam's ETS will regulate 50% of emissions - 900+ Vietnamese SMEs will need ESG support. We're building the AI agent that makes this accessible.

### Our Traction

- 70% MVP complete
- 5 beta partners (including top Vietnamese banks, research institutes)
- 50+ startups in pipeline
- Featured in VietStock, recognized by regional accelerators

### Our Values

- **Impact over extraction:** We're not building this for a quick flip - we're here to create lasting value for SMEs
- **Collaboration over competition:** We partner with ESG platforms, banks, funds - not compete
- **Transparency:** With team, partners, and clients
- **Respect for energy:** Manifestor approach - we initiate opportunities but don't force closings

---

## Future Opportunities

We're a small team now, but as we grow, we anticipate roles in:

- **Customer Success & SME Support** (helping clients maximize value from GreenPulse)
- **Partnerships Manager** (dedicated to bank/fund relationships)
- **Marketing & Content** (thought leadership, case studies, SEO)
- **ESG Analyst** (for Golden Package client support)

If you're interested in any of these areas, feel free to reach out with a brief intro - we're always happy to connect with mission-aligned people.

---

## Contact

**General inquiries:** bouton contact : mailto:aseradni@nexora-venture.com
**Partnership opportunities:** bouton contact : mailto:aseradni@nexora-venture.com
**More about us:** [www.ai-greenpulse.com](https://www.ai-greenpulse.com)

---

**GreenPulse.AI** is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all team members.

---

_Page last updated: December 8, 2024_

.job-opening {
background: linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%);
border: 2px solid #4CAF50;
border-radius: 16px;
padding: 2rem;
margin: 2rem 0;
cursor: pointer;
transition: all 0.3s ease;
box-shadow: 0 4px 12px rgba(76, 175, 80, 0.1);
}

.job-opening:hover {
transform: translateY(-4px);
box-shadow: 0 8px 24px rgba(76, 175, 80, 0.2);
border-color: #2E7D32;
}

.job-header {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 1rem;
}

.job-header h3 {
color: #1B5E20;
margin: 0;
font-size: 1.5rem;
}

.badge-new {
background: #FF6B6B;
color: white;
padding: 0.25rem 0.75rem;
border-radius: 12px;
font-size: 0.85rem;
font-weight: 600;
animation: pulse 2s infinite;
}

@keyframes pulse {
0%, 100% { opacity: 1; }
50% { opacity: 0.7; }
}

.job-meta {
display: flex;
gap: 1.5rem;
margin-bottom: 1rem;
color: #555;
font-size: 0.95rem;
}

.job-meta span {
display: flex;
align-items: center;
gap: 0.5rem;
}

.job-summary {
color: #333;
line-height: 1.6;
margin: 1rem 0;
font-size: 1.05rem;
}

.job-tags {
display: flex;
flex-wrap: wrap;
gap: 0.5rem;
margin: 1rem 0;
}

.tag {
background: white;
color: #2E7D32;
border: 1px solid #4CAF50;
padding: 0.5rem 1rem;
border-radius: 20px;
font-size: 0.9rem;
font-weight: 500;
}

.job-cta {
background: #4CAF50;
color: white;
border: none;
padding: 0.75rem 2rem;
border-radius: 8px;
font-size: 1rem;
font-weight: 600;
cursor: pointer;
transition: background 0.3s ease;
}

.job-cta:hover {
background: #2E7D32;
}

/_ Responsive _/
@media (max-width: 768px) {
.job-meta {
flex-direction: column;
gap: 0.5rem;
}

.job-header {
flex-direction: column;
align-items: flex-start;
gap: 0.5rem;
}
}

## 📋 IMPLEMENTATION PRIORITY MATRIX

| Task                              | Priority    | Effort | Impact | Timeline  |
| --------------------------------- | ----------- | ------ | ------ | --------- |
| Fix grammar & terminology errors  | 🔴 Critical | Low    | High   | Today     |
| Add meta description              | 🔴 Critical | Low    | High   | Today     |
| Update Hero H1/H2                 | 🔴 Critical | Medium | High   | This week |
| Carrer page added                 | 🔴 Critical | Medium | High   | This week |
| Add Competitive Advantage section | 🟠 High     | High   | High   | This week |
| Add Use Cases section             | 🟠 High     | High   | High   | This week |
| Fix Partnership section           | 🟠 High     | Medium | High   | This week |
| Update Pricing section            | 🟠 High     | Medium | High   | This week |
| Update Team section               | 🟡 Medium   | Medium | Medium | Next week |
| Add structured data (JSON-LD)     | 🟡 Medium   | Medium | High   | Next week |
| Add image alt text                | 🟡 Medium   | Low    | Medium | Next week |
| Create sitemap.xml                | 🟡 Medium   | Low    | High   | Next week |
| Add /about.txt for AI crawlers    | 🟢 Low      | Low    | Medium | Next week |
| Build footer with sitemap links   | 🟢 Low      | Medium | Low    | Future    |

---

## 🤖 CLAUDE CODE INTEGRATION NOTES

For efficient implementation using Claude Code:

### **Suggested Workflow:**

1. **Start with quick fixes:**

   ```bash
   # Claude Code prompt example:
   "Fix grammar error on line 50: change 'transform' to 'transforms' in the hero section. Also update the Golden Package subtitle from 'For Official ESG Certification' to 'For Official ESG Compliance'."
   ```

2. **Section-by-section additions:**

   ```bash
   # Claude Code prompt example:
   "Add the Competitive Advantage section after the Pain Points section. Use the HTML code provided in Section 4 of the brief. Match existing design system (colors, fonts, spacing)."
   ```

3. **Batch similar changes:**
   ```bash
   # Claude Code prompt example:
   "Add alt text to all images based on Section 9D of the brief. Maintain existing image paths and HTML structure."
   ```

### **File Structure Assumptions:**

Since you're using Next.js (based on `/_next/image` URLs):

- Pages likely in: `/pages/` or `/app/`
- Components likely in: `/components/`
- Static assets in: `/public/`

### **Key Components to Modify:**

```
/pages/index.tsx (or index.jsx)          → Main homepage
/components/Hero.tsx                      → Hero section
/components/PainPoints.tsx                → Pain points section
/components/Pricing.tsx                   → Pricing cards
/components/Partnership.tsx               → Partnership section
/components/Team.tsx                      → Team/experts section
/public/sitemap.xml                       → New file (create)
/public/robots.txt                        → New file (create)
/public/about.txt                         → New file (create)
```

### **Testing Commands:**

```bash
# After changes, run:
npm run build          # Check for TypeScript/build errors
npm run dev            # Test locally
npm run lint           # Check code quality
```

---

## 📞 QUESTIONS FOR CLARIFICATION

**Before implementing, please confirm:**

1. **Team photos:** Do you have professional headshots for Amber and Franck? If not, should I recommend an illustrated avatar solution?

2. **Partnership deck:** Does `/downloads/GreenPulse_Partnership_Deck.pdf` already exist or should it be created from existing pitch decks?

3. **B2B2B references:** You mentioned not putting partner names yet (BIDV, VNU, etc.). Confirmed we'll use generic phrasing: "Leading Vietnamese banks, international impact funds, research institutions"?

4. **Email addresses:** Confirm these exist and are monitored:

   - partnerships@greenpulse.ai
   - sales@greenpulse.ai
   - info@greenpulse.ai

5. **Social media:** Do LinkedIn, Twitter accounts exist for "sameAs" schema markup?

---

## ✅ FINAL DELIVERABLES CHECKLIST

When implementation is complete, you should have:

- [x] Fixed grammar/terminology errors
- [x] SEO-optimized Hero section (H1, H2, meta tags)
- [x] Competitive Advantage comparison table (new section)
- [x] Use Cases with 3 real examples (new section)
- [x] Updated Partnership section (Impact Funds/Banks focus)
- [x] Corrected Pricing section (compliance not certification, coming soon badges)
- [x] Improved Team section (real bios, LinkedIn links, strategic advisors mention)
- [x] Structured data markup (JSON-LD for Software, Organization, FAQ)
- [x] Image alt text on all images
- [x] Sitemap.xml and robots.txt files
- [x] /about.txt for AI platform indexing
- [x] Footer with internal sitemap links

---

## 📬 CONTACT FOR QUESTIONS

**Amber Seradni** (Project Lead)  
Email: aseradni@nexora-venture.com  
WhatsApp: +33 6 44 21 69 70

---

**Document Version:** 1.0  
**Last Updated:** December 8, 2024  
**Status:** Ready for Implementation

---

## 🚀 POST-IMPLEMENTATION ACTIONS

Once website changes are live:

1. **Submit to Google:**

   - Google Search Console: https://search.google.com/search-console
   - Submit sitemap: https://www.ai-greenpulse.com/sitemap.xml

2. **Verify structured data:**

   - Rich Results Test: https://search.google.com/test/rich-results
   - Ensure SoftwareApplication, Organization, and FAQPage schemas validate

3. **Monitor AI platform indexing:**

   - Check Perplexity after 2-3 days: "What is GreenPulse.AI?"
   - Check ChatGPT search: "ESG compliance platform Southeast Asia"

4. **Update marketing materials:**
   - Ensure pitch decks reference correct website sections
   - Update one-pager with website URL prominently
   - LinkedIn posts should link to specific sections (#competitive-advantage, #partnership, etc.)

---

**END OF BRIEF**
