import { type Thing, type WithContext } from 'schema-dts'

export const organizationSchema: WithContext<Thing> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GreenPulse.AI',
  alternateName: 'GreenPulse',
  url: 'https://www.ai-greenpulse.com',
  logo: 'https://www.ai-greenpulse.com/logo.png',
  description:
    'AI-powered ESG compliance platform for Southeast Asian SMEs. Automated sustainability reporting, carbon tracking, and green finance readiness.',
  foundingDate: '2024',
  founders: [
    {
      '@type': 'Person',
      name: 'Amber Seradni',
      jobTitle: 'CEO & Co-Founder',
      description: '12+ years in sustainability strategy and ESG consulting',
    },
    {
      '@type': 'Person',
      name: 'Franck Leclair',
      jobTitle: 'CTO & Co-Founder',
      description: '15+ years building AI/ML systems at scale',
    },
  ],
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'VN',
    addressRegion: 'Ho Chi Minh City',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'aseradni@nexora-venture.com',
    contactType: 'Customer Service',
  },
  sameAs: [
    'https://www.linkedin.com/company/greenpulse-ai',
    'https://twitter.com/greenpulseai',
  ],
}

export const websiteSchema: WithContext<Thing> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'GreenPulse.AI',
  url: 'https://www.ai-greenpulse.com',
  description:
    'Transform sustainability data into green finance opportunities. AI-powered ESG compliance for SMEs.',
  publisher: {
    '@type': 'Organization',
    name: 'GreenPulse.AI',
  },
}

export const softwareApplicationSchema: WithContext<Thing> = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'GreenPulse.AI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier available for ESG exploration',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '50',
  },
  featureList: [
    'Smart Data Extraction (Voice, Photo, Document AI)',
    'Instant ESG Scoring (GRI, SFDR, CSRD)',
    'Automated Compliance Reports',
    'Green Finance Readiness Assessment',
    'Real-time Dashboard',
  ],
}

export const faqSchema: WithContext<Thing> = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How is GreenPulse different from ChatGPT or other general AI tools?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "GreenPulse is purpose-built for ESG compliance with international frameworks (GRI, SFDR, CSRD) programmed into the system. Unlike general AI, we provide accurate compliance guidance, automate data extraction from documents/voice/photos, and generate audit-ready reports with verifiable sources.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is my data secure? Do you share it with third parties?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your data is encrypted and stored securely on ISO 27001-compliant servers. We never share your data with third parties. Enterprise clients can opt for sovereign security with compartmentalized AI agents for maximum data protection.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can GreenPulse integrate with our existing tools?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. GreenPulse offers one-click integration with popular ERP and CRM systems (Excel, SAP, Oracle, Salesforce). API access available for custom integrations in Premium and Golden packages.',
      },
    },
    {
      '@type': 'Question',
      name: 'What frameworks does GreenPulse support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'GreenPulse supports GRI (Global Reporting Initiative), SFDR (EU Sustainable Finance), CSRD (Corporate Sustainability Reporting Directive), SDG (UN Sustainable Development Goals), GHG Protocol (carbon accounting), and regional standards (Vietnam ETS, Thailand green banking requirements).',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does GreenPulse cost for SMEs?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Free tier available for ESG exploration. Premium package (coming soon) for growth-stage companies needing green marketing and finance access. Golden package (custom pricing) for audit-ready compliance and international export requirements. White-label solutions for banks and impact funds available.',
      },
    },
  ],
}
