/**
 * Enhanced SEO Configuration for EZBill
 *
 * Professional invoicing and billing system with PDF generation, client management, and payment tracking.
 * Data extracted from docs/seo/ALL-APPS-SUMMARY.md
 */

import type { AppSEOConfig } from './ezstart'

export const ezbillSEO: AppSEOConfig = {
  appName: 'EZBill',
  tagline: 'Professional Invoicing Without the Subscription',
  shortDescription: 'Open-source invoicing system with PDF generation, client management, and payment tracking - yours forever.',
  longDescription: `EZBill is a professional invoicing and billing system that lets you send beautiful, customizable invoices without expensive monthly subscriptions. Built for freelancers, consultants, small agencies, and B2B SaaS companies, EZBill provides everything needed for professional invoicing: generate beautiful PDF invoices with your branding, manage unlimited clients with contact information and history, create quotes and proposals before invoices, track payment status and send automated reminders, support multiple currencies and tax rates, and maintain complete invoice history with search and filtering. Unlike $29/month invoicing SaaS that limits clients and invoices, EZBill is open-source and self-hosted - pay once (or nothing), use forever. No per-invoice fees, no client limits, no features locked behind premium tiers. The same professional invoices that freelancers use to bill Fortune 500 companies, agencies use to invoice clients, and SaaS businesses use for B2B billing. Built with attention to detail: invoice numbers auto-increment, due dates calculate automatically, late payment reminders send on schedule, and PDF generation is fast and reliable. TypeScript throughout means reliable invoicing without bugs. Customizable templates let you match your brand. Multi-currency support handles international clients. Stop paying $360/year for basic invoicing. Own your invoicing system forever with EZBill.`,

  mission: {
    what: 'Professional invoicing system with PDF generation, client management, and payment tracking.',
    why: 'Freelancers and small businesses pay $29-99/month for basic invoicing software with artificial limits on clients and invoices.',
    how: 'Provide professional invoicing without subscriptions. Open-source and yours forever.',
  },

  features: [
    {
      title: 'PDF Generation - Beautiful Invoices Automatically',
      description: 'Professional PDF invoices with your branding, generated instantly',
      longDescription: 'Every invoice needs to look professional. EZBill generates beautiful PDF invoices automatically with your company logo, brand colors, and contact information. Includes all necessary details: invoice number, issue date, due date, line items with descriptions and amounts, subtotal and tax calculations, payment terms and instructions, and late payment policies. PDFs are generated server-side for reliability, optimized for printing, and email-friendly for sharing. Templates are customizable - modify layouts, fonts, colors to match your brand. Support for multiple languages means international clients get invoices in their language.',
      icon: 'lucide:FileText',
      keywords: ['pdf invoice generation', 'invoice template', 'professional invoices', 'custom invoicing', 'branded invoices'],
      useCases: [
        'Freelancers sending professional invoices to corporate clients',
        'Agencies generating monthly billing statements for retainer clients',
        'B2B SaaS creating detailed invoices with line items and taxes',
      ],
    },
    {
      title: 'Client Management - CRM for Your Customers',
      description: 'Unlimited clients with contact info, history, and relationship tracking',
      longDescription: 'Keep track of everyone you bill. EZBill includes client management with unlimited contacts - no artificial limits. Store company details, billing addresses, contact persons, email addresses, payment terms, tax IDs for compliance, and custom notes. View complete history for each client: all invoices, quotes, payments, and communications in one place. Search and filter clients easily. Tag clients for organization (active, archived, VIP). Export client data for accounting software. The same CRM features that expensive invoicing software charges $99/month for, included free.',
      icon: 'lucide:Users',
      keywords: ['client management', 'customer database', 'invoice history', 'client crm', 'contact management'],
      useCases: [
        'Consultants managing relationships with 50+ clients',
        'Agencies tracking multiple contacts per client company',
        'Service businesses maintaining client payment history',
      ],
    },
    {
      title: 'Quote System - Proposals Before Invoices',
      description: 'Create professional quotes, convert to invoices when accepted',
      longDescription: 'Get project approval before billing. EZBill\'s quote system lets you create professional proposals with detailed line items, optional items for client choice, valid-until dates for urgency, and terms and conditions. Clients can review quotes (via shareable link), accept electronically (with signature), or request revisions. Once accepted, convert quotes to invoices with one click - all data transfers automatically. Track quote status: sent, viewed, accepted, expired. Include deposit amounts for upfront payments. Professional quote PDFs match your invoice branding.',
      icon: 'lucide:FileCheck',
      keywords: ['quote generation', 'proposal software', 'estimate creator', 'project quotes', 'invoice quotes'],
      useCases: [
        'Contractors providing estimates before starting work',
        'Freelancers proposing project scope and pricing',
        'Agencies outlining monthly retainer services',
      ],
    },
  ],

  targetAudience: [
    {
      persona: 'Freelancers and Consultants',
      painPoints: [
        'Paying $29+/month for basic invoicing features',
        'Limited to 5-10 clients on free plans',
        'Need professional invoices for corporate clients',
        'Manual tracking of payments is tedious',
      ],
      goals: [
        'Professional invoices without monthly fees',
        'Unlimited clients and invoices',
        'Track payment status automatically',
        'Look legitimate to corporate clients',
      ],
      characteristics: [
        'Working with 10-50 clients per year',
        'Cost-conscious but quality-focused',
        'Need simple, reliable invoicing',
        'Want to own their business tools',
      ],
    },
    {
      persona: 'Small Agencies (1-20 employees)',
      painPoints: [
        'Multiple team members need invoicing access',
        'Client invoices scattered across tools',
        'Hard to track who owes what',
        'Monthly subscription adds up with team seats',
      ],
      goals: [
        'Centralized invoicing for whole team',
        'Complete client billing history',
        'Professional brand presentation',
        'Cost-effective for growing team',
      ],
      characteristics: [
        'Managing 20-100+ active clients',
        'Need collaboration features',
        'Require client reporting',
        'Growing fast - tools must scale',
      ],
    },
    {
      persona: 'B2B SaaS Companies',
      painPoints: [
        'Need detailed invoices for enterprise clients',
        'Clients require customized invoicing',
        'Tax compliance for multiple jurisdictions',
        'Integration with payment systems',
      ],
      goals: [
        'Automate invoice generation',
        'Customizable for enterprise requirements',
        'Multi-currency and tax support',
        'Integration with Stripe/payment systems',
      ],
      characteristics: [
        'Billing $10K-$100K+ per client',
        'Enterprise sales require compliance',
        'Need custom invoice terms',
        'Require automation and APIs',
      ],
    },
  ],

  useCases: [
    {
      title: 'Freelancer: From $30/month to $0',
      before: 'Paying $30/month for invoicing software, limited to 10 clients. Hit limit, had to upgrade to $50/month plan. $600/year just to send invoices felt ridiculous.',
      after: 'Unlimited invoices, custom branding, zero monthly fees. Saved $600/year immediately. Better features than paid tool. Professional invoices impress corporate clients.',
      metrics: {
        costBefore: '$600/year subscription',
        costAfter: '$0/year (saved $600)',
      },
    },
    {
      title: 'Agency: Centralized Billing',
      before: 'Team of 8 used different invoicing tools. No centralized client database. Couldn\'t see who invoiced which clients. Lost invoices, missed payments, unprofessional.',
      after: 'Entire team uses EZBill. All clients in one database. Complete billing history. Consistent professional invoices. Payment tracking automatic. Never miss invoices.',
      metrics: {
        timelineBefore: 'Scattered tools, lost invoices',
        timelineAfter: 'Centralized, professional system',
      },
    },
  ],

  keywords: {
    primary: [
      { term: 'invoicing software', volume: 4400 },
      { term: 'invoice generator', volume: 3600 },
      { term: 'pdf invoices', volume: 2900 },
      { term: 'billing system', volume: 1800 },
      { term: 'freelance invoicing', volume: 1400 },
    ],
    secondary: [
      { term: 'online invoice creator', volume: 880 },
      { term: 'professional invoice template', volume: 720 },
      { term: 'quote and invoice software', volume: 480 },
      { term: 'client billing system', volume: 390 },
      { term: 'open source invoicing', volume: 320 },
    ],
    longTail: [
      { term: 'free invoicing software self hosted', volume: 210 },
      { term: 'invoice generator without subscription', volume: 140 },
      { term: 'best invoicing software for freelancers', volume: 110 },
      { term: 'pdf invoice creator with logo', volume: 90 },
      { term: 'invoice and quote management system', volume: 70 },
    ],
  },

  usps: {
    title: 'Own Your Invoicing System Forever - No Monthly Fees',
    description: 'Professional invoicing without the subscription trap',
    differentiators: [
      'No Subscription Fees: Pay nothing monthly - own it forever',
      'Unlimited Everything: No limits on clients, invoices, or users',
      'Professional PDFs: Beautiful, branded invoices that impress clients',
      'Complete Features: PDF generation, client CRM, quotes, payment tracking',
      'Open Source: Customize anything, no vendor lock-in',
      'Multi-Currency: Handle international clients easily',
      'Tax Support: Calculate taxes for different jurisdictions',
      'Self-Hosted: Your data, your server, your control',
    ],
  },

  vsCompetition: [
    {
      category: 'VS Invoicing SaaS (FreshBooks, Wave, Zoho)',
      competitors: ['FreshBooks ($15-50/mo)', 'Wave (ads + fees)', 'Zoho Invoice ($9-29/mo)'],
      ourAdvantage: 'They charge $15-50/month forever ($180-600/year). EZBill is free and open-source. After 1 year, you\'ve saved $180-600. After 5 years, saved $900-3,000. Plus, unlimited clients and features - no artificial limits.',
    },
    {
      category: 'VS Free Invoicing Tools',
      competitors: ['Invoice Generator', 'Free Invoice Creator'],
      ourAdvantage: 'Free tools lack client management, payment tracking, and customization. EZBill has complete features: client database, payment status, custom branding, quote system. Professional solution, not just a template.',
    },
  ],

  visualAssets: [
    {
      type: 'gif',
      title: 'Invoice Creation',
      description: 'Fill form → Generate PDF → Beautiful invoice in 30 seconds',
      specs: {
        duration: '8 seconds loop',
        resolution: '1200×800',
        format: 'GIF',
        size: '<2MB',
      },
    },
    {
      type: 'screenshot',
      title: 'Invoice Dashboard',
      description: 'Overview of all invoices with status tracking',
      specs: {
        resolution: '1400×900',
        format: 'WebP',
      },
    },
    {
      type: 'screenshot',
      title: 'Sample Invoice PDF',
      description: 'Professional invoice with branding',
      specs: {
        resolution: '800×1100',
        format: 'WebP',
      },
    },
  ],

  callToAction: {
    primary: 'Create Your First Invoice',
    secondary: 'Try Demo',
    url: 'https://bill.ezstart.xyz',
  },

  socialProof: {
    stats: [
      { label: 'Annual Savings', value: '$600+' },
      { label: 'Clients Supported', value: 'Unlimited' },
      { label: 'PDF Generation Time', value: '<2 seconds' },
      { label: 'Monthly Cost', value: '$0' },
    ],
  },

  faq: [
    {
      question: 'Is EZBill really free with no limits?',
      answer: 'Yes, 100% open-source and self-hosted. Unlimited clients, unlimited invoices, unlimited users. No premium tiers, no hidden fees, no artificial limits. You host it, you own it.',
    },
    {
      question: 'Can I customize invoice templates?',
      answer: 'Yes! Add your logo, change colors, modify layouts, adjust fonts. All templates are customizable. Create multiple templates for different clients or invoice types.',
    },
    {
      question: 'Does it support my currency?',
      answer: 'Yes, multi-currency support included. Set default currency, use different currencies per client or invoice. Supports all major currencies and symbols.',
    },
    {
      question: 'Can I track which invoices are paid?',
      answer: 'Yes, payment tracking is built-in. Mark invoices as paid, pending, overdue. See payment status at a glance. Send automatic reminders for overdue invoices.',
    },
    {
      question: 'Does it integrate with accounting software?',
      answer: 'EZBill can export data in common formats (CSV, JSON). Many users import into QuickBooks, Xero, etc. API available for custom integrations.',
    },
  ],

  brandVoice: {
    tone: [
      'Cost-savings focused - emphasize no subscription',
      'Professional quality without the price',
      'Practical and business-focused',
      'Transparent about what\'s included',
    ],
    avoid: [
      'Attacking other invoicing tools directly',
      'Claiming "enterprise" features without substance',
      'Overpromising accounting features (it\'s invoicing)',
      'Comparing to vastly different tools',
    ],
  },
}

export default ezbillSEO
