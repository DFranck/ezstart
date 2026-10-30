import { type Thing, type WithContext } from 'schema-dts'

export const organizationSchema: WithContext<Thing> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GreenPulse.AI',
  alternateName: 'GreenPulse',
  url: 'https://www.ai-greenpulse.com',
  logo: 'https://www.ai-greenpulse.com/logo.png',
  description:
    'Accelerating low-carbon growth through trusted data, agentic AI and practical solutions: carbon footprint and MRV, export readiness, green finance readiness and business capacity building in Vietnam and ASEAN.',
  foundingDate: '2024',
  founder: [
    {
      '@type': 'Person',
      name: 'Amber Seradni',
      jobTitle: 'CEO & Co-Founder',
      description:
        '12+ years in sustainable growth strategy across governmental bodies and the private sector',
    },
    {
      '@type': 'Person',
      name: 'Franck Dufournet',
      jobTitle: 'CTO & Co-Founder',
      description:
        '7+ years in tech engineering: full-stack architecture, NLP, data extraction and AI integration',
    },
  ],
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'VN',
    addressRegion: 'Ho Chi Minh City',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    url: 'https://www.ai-greenpulse.com/#partnership',
    contactType: 'Customer Service',
  },
  sameAs: ['https://www.linkedin.com/company/greenpulse-ai', 'https://twitter.com/greenpulseai'],
}

export const websiteSchema: WithContext<Thing> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'GreenPulse.AI',
  url: 'https://www.ai-greenpulse.com',
  description: 'Accelerating low-carbon growth through trusted data, AI and practical solutions.',
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
    description: 'Free Awareness plan available',
  },
  featureList: [
    'Agentic AI: data extraction from conversations, documents, photos and voice',
    'Carbon footprint assessment (Scope 1, 2, 3) and MRV',
    'Climate action plans and low-carbon growth roadmaps',
    'Export readiness and certification accompaniment',
    'Green finance readiness assessment',
    'Drop-in integration with ERP, CRM and spreadsheets',
  ],
}
