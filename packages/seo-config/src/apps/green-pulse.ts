/**
 * Enhanced SEO Configuration for GreenPulse.AI
 *
 * AI-powered ESG compliance platform for Southeast Asian SMEs
 * Updated: December 8, 2024 - Aligned with B2B2B strategy
 */

import type { AppSEOConfig } from './ezstart'

export const greenPulseSEO: AppSEOConfig = {
  appName: 'GreenPulse.AI',
  tagline: 'One Sustainable Agent for 1 Million Businesses',
  shortDescription: 'AI-powered ESG compliance platform helping Southeast Asian SMEs reduce costs, access green finance, and achieve sustainability goals.',
  longDescription: `GreenPulse.AI is the AI-powered ESG compliance platform built specifically for Southeast Asian SMEs. We transform sustainability data into bankable green finance opportunities. With 98% of SMEs in Southeast Asia having zero access to ESG knowledge, GreenPulse democratizes compliance through conversational AI that guides businesses step-by-step through carbon tracking, automated reporting (GRI, SFDR, CSRD), and green loan readiness. Instead of hiring expensive ESG consultants or navigating complex frameworks alone, SMEs simply describe their business through voice, photos, or documents - our AI extracts data, calculates carbon footprint, identifies cost-saving opportunities, and generates audit-ready reports. Built by ESG practitioners who understand the challenges of compliance, stakeholder expectations, and the gap between global buyers demanding sustainability proof and SMEs lacking resources. GreenPulse serves three audiences: SMEs needing to reduce costs and access green finance, Impact Funds requiring portfolio ESG monitoring, and Banks offering green loan products. Our B2B2B model provides white-label solutions for financial institutions to deploy ESG compliance at scale across their SME networks. By 2025, Vietnam's ETS will regulate 50% of emissions - 900+ Vietnamese SMEs will need ESG support. We're building the sustainable agent that makes this accessible, affordable, and actionable.`,

  mission: {
    what: 'AI-powered ESG compliance platform for Southeast Asian SMEs to access green finance and meet export standards',
    why: '98% of Southeast Asian SMEs have zero ESG knowledge while global buyers demand sustainability proof by 2025',
    how: 'Conversational AI + automated data extraction + audit-ready reporting aligned with international frameworks (GRI, SFDR, CSRD)',
  },

  features: [
    {
      title: 'Smart Data Extraction - Voice, Photo, Document AI',
      description: 'Extract sustainability data from any source automatically',
      longDescription: 'SMEs don\'t have time for manual data entry. GreenPulse uses AI to extract ESG data from voice conversations, photos of equipment/invoices, and existing documents (Excel, PDFs, ERP exports). Simply speak about your operations: "We have 15 employees, 10 machines consuming 5000 kWh monthly" - AI captures structured data. Upload a photo of your electricity bill - AI extracts consumption patterns. Import supplier invoices - AI maps supply chain emissions automatically. All data flows into a unified dashboard with real-time carbon tracking, cost analysis, and compliance monitoring. One-click integration with existing ERP/CRM systems (SAP, Oracle, Salesforce, Excel) means no duplicate work. AI pre-fills ESG questionnaires based on your business profile, saving 60% of reporting time.',
      icon: 'lucide:Database',
      keywords: ['esg data collection', 'carbon tracking', 'sustainability data extraction', 'ai esg platform', 'automated esg reporting'],
      useCases: [
        'Textile SME reducing energy costs by 30% through AI-recommended solar panels',
        'Restaurant cutting costs 35% with LED upgrades and composting system',
        'Agribusiness securing $2M EU export contract with CSRD-compliant reporting',
      ],
    },
    {
      title: 'Instant ESG Scoring - GRI, SFDR, CSRD Compliance',
      description: 'Real-time compliance assessment against international frameworks',
      longDescription: 'Global buyers require ESG proof. Banks need compliance documentation for green loans. GreenPulse provides instant ESG scoring aligned with international standards: GRI (Global Reporting Initiative) for sustainability reporting, SFDR (EU Sustainable Finance Disclosure Regulation) for impact investors, CSRD (Corporate Sustainability Reporting Directive) for EU export requirements, and SDG (UN Sustainable Development Goals) mapping. AI analyzes your operations and scores performance across environmental (carbon emissions, energy efficiency, waste management), social (employee welfare, community impact, supply chain ethics), and governance (transparency, compliance, risk management) dimensions. Real-time dashboards show progress toward green loan eligibility, export readiness, and investor ESG requirements. Unlike generic ESG software requiring manual compliance checklists, GreenPulse\'s AI understands Southeast Asian business context and recommends region-specific improvements.',
      icon: 'lucide:TrendingUp',
      keywords: ['esg compliance', 'gri reporting', 'csrd compliance', 'sfdr reporting', 'esg scoring sme'],
      useCases: [
        'Impact fund screening 50+ portfolio companies in 2 hours instead of 2 weeks',
        'Vietnamese bank assessing green loan eligibility for SME clients',
        'Export-oriented manufacturer proving EU supply chain sustainability',
      ],
    },
    {
      title: 'Automated Compliance Reports - Audit-Ready Documentation',
      description: 'Generate GRI, SFDR, CSRD reports automatically with AI',
      longDescription: 'ESG reporting is complex and time-consuming. GreenPulse automates the entire process: AI generates audit-ready reports formatted for GRI standards (used by 78% of global companies), SFDR disclosures (required by EU impact investors), and CSRD compliance (mandatory for EU supply chains). Reports include carbon footprint calculations verified against GHG Protocol, sustainability KPIs with benchmarks against industry standards, improvement recommendations with ROI analysis, and green finance readiness assessment. Each report shows data sources, calculation methodologies, and confidence levels for regulatory transparency. AI agent acts as virtual ESG manager - answers auditor questions, explains compliance gaps, provides remediation roadmaps. Reports export as PDFs for bank loan applications, investor due diligence, or customer sustainability questionnaires. White-label option allows banks and impact funds to offer branded ESG reporting to their SME clients.',
      icon: 'lucide:FileText',
      keywords: ['esg reporting automation', 'gri report generator', 'csrd compliance tool', 'green finance readiness', 'sustainability audit'],
      useCases: [
        'SME securing $200K green loan from Vietnamese bank with automated compliance report',
        'Impact fund generating portfolio ESG health monitoring for LP communications',
        'Manufacturer passing EU buyer sustainability audit with CSRD-compliant documentation',
      ],
    },
  ],

  targetAudience: [
    {
      persona: 'Southeast Asian SMEs Seeking Green Finance',
      painPoints: [
        'High energy costs eating into profits',
        'Banks require ESG documentation we don\'t have',
        'EU buyers demand sustainability proof for exports',
        'No resources to hire ESG consultants ($10K+ fees)',
        'Overwhelmed by GRI, SFDR, CSRD frameworks',
      ],
      goals: [
        'Reduce operational costs (energy, waste)',
        'Access green loans with preferential interest rates',
        'Meet EU export sustainability requirements',
        'Build credible green marketing (no greenwashing)',
        'Demonstrate ESG performance to investors',
      ],
      characteristics: [
        'Manufacturing, hospitality, agriculture sectors',
        'Vietnam, Thailand, Indonesia, Philippines markets',
        '15-500 employees, $1M-$50M annual revenue',
        'Limited ESG knowledge, need step-by-step guidance',
        'Price-sensitive, value cost savings over compliance',
      ],
    },
    {
      persona: 'Impact Funds Managing ESG Portfolios',
      painPoints: [
        'Due diligence takes weeks per company',
        'Portfolio companies lack ESG documentation',
        'Manual compliance tracking across 50+ investments',
        'Limited visibility into portfolio ESG health',
        'LP reporting requires standardized metrics',
      ],
      goals: [
        'Screen investment opportunities quickly (ESG risk)',
        'Monitor portfolio ESG performance in real-time',
        'Automate compliance tracking and reporting',
        'Support portfolio companies with ESG roadmaps',
        'Generate impact reports for LP communications',
      ],
      characteristics: [
        'Managing $50M-$500M AUM in Southeast Asia',
        'Focus on SDG-aligned investments (climate, gender)',
        'Need SFDR-compliant reporting for EU LPs',
        'Value data-driven ESG screening',
        'Seek white-label solutions for portfolio support',
      ],
    },
    {
      persona: 'Banks Offering Green Finance Products',
      painPoints: [
        'SME clients can\'t prove green loan eligibility',
        'Manual ESG assessment is time-consuming',
        'Limited staff expertise in sustainability',
        'Central bank green credit mandates require compliance',
        'Need scalable solution across thousands of SMEs',
      ],
      goals: [
        'Deploy green loan products at scale',
        'Automate ESG eligibility assessment',
        'Provide value-added services to SME clients',
        'Meet central bank green finance targets',
        'Differentiate from competitors with sustainability',
      ],
      characteristics: [
        'Regional banks in Vietnam, Thailand, Indonesia',
        'Serving 10K+ SME clients',
        'Government green finance mandates (SBV Vietnam)',
        'Seek white-label ESG platform for SME network',
        'Value partnership over build-in-house',
      ],
    },
  ],

  useCases: [
    {
      title: 'Textile SME: $50K Annual Savings + $200K Green Loan',
      before: 'High energy costs, no ESG documentation for EU export clients. Losing competitive advantage to sustainable suppliers. Denied green loan due to lack of compliance proof.',
      after: 'GreenPulse calculated carbon footprint, recommended solar panels + energy-efficient machines. Generated CSRD-compliant report for EU buyers. Secured $200K green loan from Vietnamese bank. 30% energy cost reduction ($50K/year savings). Gained 2 new EU buyers requiring sustainability proof.',
      metrics: {
        timelineBefore: 'Unable to access green finance',
        timelineAfter: '$200K loan secured in 3 weeks',
      },
    },
    {
      title: 'Impact Fund: Portfolio ESG Monitoring in 2 Hours',
      before: 'Managing 50+ portfolio companies across Southeast Asia. Due diligence takes 2 weeks per company. Manual compliance tracking with spreadsheets. No real-time visibility into ESG performance. LP reporting requires weeks of data collection.',
      after: 'GreenPulse white-label platform deployed across portfolio. Multi-criteria ESG analysis (SDG, GRI, SFDR) with instant risk scoring. Real-time dashboard shows portfolio ESG health. Automated project filtering saves 40% due diligence time. Standardized impact reporting for LP communications.',
      metrics: {
        timelineBefore: '2 weeks per due diligence',
        timelineAfter: '2 hours for 50 companies',
      },
    },
    {
      title: 'Vietnamese Bank: Green Loan Product Launch',
      before: 'State Bank of Vietnam mandates green finance targets. SME clients want green loans but lack ESG documentation. Manual assessment takes 3-4 weeks per application. Limited staff expertise in sustainability frameworks. Only 5% of SMEs qualify due to compliance gaps.',
      after: 'GreenPulse white-label solution ("Green [Bank Name] powered by GreenPulse") deployed. SME clients self-assess green loan eligibility through AI agent. Automated compliance tracking aligned with SBV requirements. Bank staff review AI-generated reports instead of manual analysis. Green loan approvals increase from 5% to 35% in 6 months.',
      metrics: {
        timelineBefore: '3-4 weeks per assessment',
        timelineAfter: '2 days automated review',
      },
    },
  ],

  keywords: {
    primary: [
      { term: 'esg compliance platform', volume: 2400 },
      { term: 'sme sustainability', volume: 1800 },
      { term: 'green finance', volume: 5400 },
      { term: 'esg reporting software', volume: 1600 },
      { term: 'carbon tracking tool', volume: 1200 },
    ],
    secondary: [
      { term: 'gri reporting tool', volume: 880 },
      { term: 'csrd compliance software', volume: 720 },
      { term: 'sfdr reporting platform', volume: 590 },
      { term: 'sustainability platform sme', volume: 480 },
      { term: 'green loan eligibility', volume: 320 },
    ],
    longTail: [
      { term: 'esg compliance southeast asia sme', volume: 170 },
      { term: 'automated esg reporting ai', volume: 140 },
      { term: 'vietnam green banking platform', volume: 90 },
      { term: 'csrd compliance tool sme', volume: 70 },
      { term: 'impact fund esg portfolio monitoring', volume: 50 },
    ],
  },

  usps: {
    title: 'The Only AI ESG Platform Built for Southeast Asian SMEs',
    description: 'Transform sustainability data into green finance opportunities',
    differentiators: [
      'B2B2B Model: SMEs + Impact Funds + Banks white-label solutions',
      'Hybrid Interface: Dashboard + Conversational AI (not just chatbot)',
      'Native ESG Expertise: GRI, SFDR, CSRD frameworks built-in (no hallucinations)',
      'All-in-One Data Collection: Voice + Photo + Doc AI extraction',
      'Auto-Update Dashboards: Real-time ESG scoring and compliance tracking',
      'One-Click ERP/CRM Sync: Seamless integration, no duplicate work',
      'Southeast Asia Focus: Vietnam, Thailand, Indonesia, Philippines expertise',
      'Cost-First Approach: 30% energy savings unlock green finance access',
    ],
  },

  vsCompetition: [
    {
      category: 'VS Generic ESG Software (Salesforce Sustainability, SAP)',
      competitors: ['Salesforce Sustainability Cloud ($200K+ setup)', 'SAP Sustainability Control Tower', 'Workiva ESG'],
      ourAdvantage: 'Enterprise ESG software costs $200K+ and requires consultants. Built for Fortune 500, not SMEs. GreenPulse is purpose-built for Southeast Asian SMEs: conversational AI (no training needed), voice/photo data extraction (no manual entry), SME-sized pricing ($0 free tier, Premium coming soon), and region-specific compliance (Vietnam ETS, Thailand green banking).',
    },
    {
      category: 'VS AI Chatbots (ChatGPT, Claude, Gemini)',
      competitors: ['ChatGPT Enterprise', 'Claude for Business', 'Generic AI assistants'],
      ourAdvantage: 'General AI chatbots hallucinate on ESG compliance - dangerous for audits. No project tracking, no dashboard visibility, no ERP integration. GreenPulse has international frameworks native (GRI, SFDR, SDG verified), project management built-in (track sustainability initiatives), smart dashboards (real-time ESG scoring), and auditable outputs (show data sources and methodologies).',
    },
  ],

  visualAssets: [
    {
      type: 'video',
      title: 'GreenPulse AI Demo: Voice to ESG Report',
      description: 'SME describes business via voice → AI extracts data → ESG report generated in 60 seconds',
      specs: {
        duration: '60 seconds',
        resolution: '1920×1080',
        format: 'MP4',
        size: '<10MB',
      },
    },
    {
      type: 'screenshot',
      title: 'Comparison Table: GreenPulse vs ESG Software vs AI Platforms',
      description: 'Hybrid interface, native ESG expertise, all-in-one data collection comparison',
      specs: {
        resolution: '1400×900',
        format: 'WebP',
      },
    },
    {
      type: 'screenshot',
      title: '3-Step Process: Discuss → AI Works → Get Results',
      description: 'Visual workflow showing data extraction, analysis, and reporting',
      specs: {
        resolution: '1200×800',
        format: 'WebP',
      },
    },
  ],

  callToAction: {
    primary: 'Get Started Free',
    secondary: 'Explore B2B2B Solutions',
    url: 'https://www.ai-greenpulse.com',
  },

  socialProof: {
    stats: [
      { label: 'Target SMEs by 2025', value: '1M' },
      { label: 'Energy Cost Reduction', value: '30%' },
      { label: 'ESG Frameworks Supported', value: 'GRI/SFDR/CSRD' },
      { label: 'Free Tier', value: 'Available' },
    ],
  },

  faq: [
    {
      question: 'How is GreenPulse different from ChatGPT or other general AI tools?',
      answer: 'GreenPulse is purpose-built for ESG compliance with international frameworks (GRI, SFDR, CSRD) programmed into the system. Unlike general AI, we provide accurate compliance guidance, automate data extraction from documents/voice/photos, and generate audit-ready reports with verifiable sources.',
    },
    {
      question: 'Is my data secure? Do you share it with third parties?',
      answer: 'Your data is encrypted and stored securely on ISO 27001-compliant servers. We never share your data with third parties. Enterprise clients can opt for sovereign security with compartmentalized AI agents for maximum data protection.',
    },
    {
      question: 'Can GreenPulse integrate with our existing tools?',
      answer: 'Yes. GreenPulse offers one-click integration with popular ERP and CRM systems (Excel, SAP, Oracle, Salesforce). API access available for custom integrations in Premium and Golden packages.',
    },
    {
      question: 'What frameworks does GreenPulse support?',
      answer: 'GreenPulse supports GRI (Global Reporting Initiative), SFDR (EU Sustainable Finance), CSRD (Corporate Sustainability Reporting Directive), SDG (UN Sustainable Development Goals), GHG Protocol (carbon accounting), and regional standards (Vietnam ETS, Thailand green banking requirements).',
    },
    {
      question: 'How much does GreenPulse cost for SMEs?',
      answer: 'Free tier available for ESG exploration. Premium package (coming soon) for growth-stage companies needing green marketing and finance access. Golden package (custom pricing) for audit-ready compliance and international export requirements. White-label solutions for banks and impact funds available.',
    },
  ],

  brandVoice: {
    tone: [
      'Empowering and accessible (democratize ESG)',
      'Practical and results-focused (cost savings first)',
      'B2B2B partnership-oriented (collaborative not competitive)',
      'Southeast Asia expertise (region-specific solutions)',
    ],
    avoid: [
      'Corporate sustainability jargon without explanation',
      'Overhyping AI capabilities (admit when human review needed)',
      'Aggressive sales tactics (manifestor energy - initiate opportunities)',
      'Dismissing traditional ESG consultants (we complement, not replace)',
    ],
  },
}

export default greenPulseSEO
