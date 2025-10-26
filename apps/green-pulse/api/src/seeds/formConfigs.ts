import type { FormConfig } from '@green-pulse/types'

/**
 * Seed data for form configurations
 * These are example forms that can be used to test the form system
 */
export const FORM_CONFIGS: Omit<FormConfig, 'createdAt' | 'updatedAt'>[] = [
  // ==================== COMPANY INSPECTION ====================
  {
    id: 'company-inspection-2025',
    name: 'Company Inspection Form',
    description: 'Collect company information during on-site inspection. For inspectors/auditors visiting multiple companies.',
    category: 'report',
    icon: '🏢',

    extraction: {
      systemPrompt: `You are helping an inspector/auditor fill out company inspection information.
Extract details about the company being visited: name, address, sector, employees, contact, etc.
Be professional and ask clarifying questions if needed.
Remember this is for an external inspector documenting a company visit.`,

      fields: [
        {
          id: 'company_name',
          label: 'Company Name',
          type: 'text',
          required: true,
          extraction: {
            keywords: ['company', 'business', 'organization', 'entreprise', 'société', 'nom'],
            aliases: ['firm', 'corporation', 'company name'],
            examples: ['ABC Corp', 'Acme Industries', 'Green Solutions SARL'],
          },
          placeholder: 'e.g., ABC Corp',
        },
        {
          id: 'company_address',
          label: 'Company Address',
          type: 'text',
          required: true,
          extraction: {
            keywords: ['address', 'location', 'adresse', 'située', 'located'],
            aliases: ['where', 'street', 'rue'],
            examples: ['123 Main St, Paris', '45 rue de la République, Lyon'],
          },
          placeholder: 'e.g., 123 Main Street, City',
        },
        {
          id: 'company_sector',
          label: 'Business Sector',
          type: 'select',
          required: true,
          extraction: {
            keywords: ['sector', 'industry', 'secteur', 'activité', 'domaine'],
            aliases: ['what does the company do', 'field'],
            examples: ['manufacturing', 'fabrication', 'technology', 'services'],
          },
          options: [
            { label: 'Manufacturing', value: 'manufacturing' },
            { label: 'Technology/IT', value: 'technology' },
            { label: 'Services', value: 'services' },
            { label: 'Retail', value: 'retail' },
            { label: 'Construction', value: 'construction' },
            { label: 'Agriculture', value: 'agriculture' },
            { label: 'Energy', value: 'energy' },
            { label: 'Healthcare', value: 'healthcare' },
            { label: 'Education', value: 'education' },
            { label: 'Other', value: 'other' },
          ],
          placeholder: 'Select sector',
        },
        {
          id: 'employee_count',
          label: 'Number of Employees',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['employees', 'staff', 'people', 'employés', 'salariés'],
            aliases: ['workforce', 'team size', 'how many people'],
            examples: ['50 employees', '200 people', 'about 100'],
          },
          validation: {
            min: 1,
            max: 100000,
          },
          placeholder: 'e.g., 50',
        },
        {
          id: 'contact_name',
          label: 'Contact Person Name',
          type: 'text',
          required: true,
          extraction: {
            keywords: ['contact', 'person', 'responsable', 'interlocuteur', 'met with'],
            aliases: ['who I met', 'spoke with', 'manager'],
            examples: ['John Doe', 'Marie Dupont', 'the CEO'],
          },
          placeholder: 'e.g., John Doe',
        },
        {
          id: 'contact_role',
          label: 'Contact Person Role',
          type: 'text',
          required: false,
          extraction: {
            keywords: ['role', 'title', 'position', 'poste', 'fonction'],
            aliases: ['job title', 'what they do'],
            examples: ['CEO', 'Operations Manager', 'Sustainability Director'],
          },
          placeholder: 'e.g., Operations Manager',
        },
        {
          id: 'contact_email',
          label: 'Contact Email',
          type: 'text',
          required: false,
          extraction: {
            keywords: ['email', 'e-mail', 'mail', 'contact'],
            aliases: ['email address'],
            examples: ['john@company.com', 'contact@company.fr'],
          },
          placeholder: 'e.g., contact@company.com',
        },
        {
          id: 'contact_phone',
          label: 'Contact Phone',
          type: 'text',
          required: false,
          extraction: {
            keywords: ['phone', 'telephone', 'téléphone', 'mobile'],
            aliases: ['number', 'call'],
            examples: ['+33 1 23 45 67 89', '01 23 45 67 89'],
          },
          placeholder: 'e.g., +33 1 23 45 67 89',
        },
        {
          id: 'inspection_date',
          label: 'Inspection Date',
          type: 'date',
          required: true,
          extraction: {
            keywords: ['date', 'when', 'visited', 'inspection', 'visite'],
            aliases: ['today', 'visit date'],
            format: 'YYYY-MM-DD',
            examples: ['today', 'October 26', '26/10/2025'],
          },
          placeholder: 'YYYY-MM-DD',
        },
        {
          id: 'notes',
          label: 'Additional Notes',
          type: 'textarea',
          required: false,
          extraction: {
            keywords: ['notes', 'observations', 'comments', 'remarques'],
            aliases: ['anything else', 'other information'],
            examples: ['Modern facility', 'Very collaborative team'],
          },
          placeholder: 'Any additional observations...',
          helpText: 'General observations about the company or visit',
        },
      ],
    },

    modes: {
      manual: true,
      chat: true,
      vocal: true,
      autoSubmit: false,
    },

    ui: {
      theme: 'blue',
      layout: 'single-column',
      showProgress: true,
      showPreview: true,
    },

    tags: ['inspection', 'audit', 'company', 'visit'],
    version: '1.0.0',
  },

  // ==================== SOLAR GRANT ====================
  {
    id: 'solar-grant-2025',
    name: 'Solar Panel Installation Grant',
    description: 'Application for government solar energy grant. Get financial support for installing solar panels on your property.',
    category: 'grant',
    icon: '☀️',

    extraction: {
      systemPrompt: `You are helping a user fill out a solar panel installation grant application.
Extract information about their property, installation plans, and budget.
Be conversational and ask follow-up questions if needed.
When you receive information, acknowledge it and ask for the next piece of data.`,

      fields: [
        {
          id: 'property_surface',
          label: 'Property Surface Area (m²)',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['surface', 'area', 'square meters', 'm²', 'size', 'maison'],
            aliases: ['house', 'property size', 'superficie'],
            format: 'number',
            examples: ['120m²', '120 square meters', 'maison de 120'],
          },
          validation: {
            min: 50,
            max: 1000,
          },
          placeholder: 'e.g., 120',
          helpText: 'Total surface area of your property',
        },
        {
          id: 'roof_orientation',
          label: 'Roof Orientation',
          type: 'select',
          required: true,
          extraction: {
            keywords: ['orientation', 'direction', 'facing', 'toit', 'orienté'],
            aliases: ['roof direction', 'roof faces'],
            examples: ['south', 'sud', 'north facing', 'facing south'],
          },
          options: [
            { label: 'North', value: 'north' },
            { label: 'South', value: 'south' },
            { label: 'East', value: 'east' },
            { label: 'West', value: 'west' },
          ],
          placeholder: 'Select orientation',
        },
        {
          id: 'budget',
          label: 'Budget (€)',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['budget', 'cost', 'price', 'euros', '€', 'combien'],
            aliases: ['prix', 'coût', 'investment'],
            format: 'currency',
            examples: ['15000€', '15k', 'fifteen thousand euros', '15000 euros'],
          },
          validation: {
            min: 5000,
            max: 50000,
          },
          placeholder: 'e.g., 15000',
          helpText: 'Total budget for the installation',
        },
        {
          id: 'panel_count',
          label: 'Number of Solar Panels',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['panels', 'panneaux', 'number', 'quantity', 'combien'],
            aliases: ['combien de panneaux', 'how many', 'nombre'],
            examples: ['20 panels', '20 panneaux', 'vingt', 'twenty'],
          },
          validation: {
            min: 5,
            max: 100,
          },
          placeholder: 'e.g., 20',
          helpText: 'Number of solar panels to install',
        },
        {
          id: 'installation_date',
          label: 'Planned Installation Date',
          type: 'date',
          required: false,
          extraction: {
            keywords: ['when', 'date', 'installation', 'quand', 'planned'],
            aliases: ['planned for', 'prévu pour', 'schedule'],
            format: 'YYYY-MM-DD',
            examples: ['next month', 'in 3 months', 'June 2025', 'juin 2025'],
          },
          placeholder: 'YYYY-MM-DD',
          helpText: 'When do you plan to install the panels?',
        },
      ],
    },

    modes: {
      manual: true,
      chat: true,
      vocal: true,
      autoSubmit: false,
    },

    ui: {
      theme: 'green',
      layout: 'single-column',
      showProgress: true,
      showPreview: true,
    },

    validation: [
      {
        rule: 'budget_vs_panels',
        message: 'Budget seems low for the number of panels (typical cost: €500-800 per panel)',
        condition: 'budget < (panel_count * 500)',
      },
    ],

    submitEndpoint: '/api/grants/solar/submit',

    tags: ['energy', 'solar', 'grant', 'government', 'renewable'],
    version: '1.0.0',
  },

  // ==================== CARBON REPORT ====================
  {
    id: 'carbon-report-2025',
    name: 'Annual Carbon Emissions Report',
    description: 'Mandatory carbon footprint declaration for businesses. Report your company emissions to comply with environmental regulations.',
    category: 'report',
    icon: '🌍',

    extraction: {
      systemPrompt: `You are helping a business owner report their annual carbon emissions.
Extract data about employees, vehicles, energy consumption, and waste.
Ask clarifying questions when needed to get accurate numbers.
Be supportive and explain why each piece of data matters.`,

      fields: [
        {
          id: 'company_name',
          label: 'Company Name',
          type: 'text',
          required: true,
          extraction: {
            keywords: ['company', 'business', 'organization', 'entreprise', 'société'],
            aliases: ['firm', 'corporation', 'name'],
            examples: ['Acme Corp', 'my company', 'notre entreprise'],
          },
          placeholder: 'e.g., Acme Corp',
        },
        {
          id: 'employee_count',
          label: 'Number of Employees',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['employees', 'staff', 'people', 'employés', 'personnes'],
            aliases: ['workforce', 'team size'],
            examples: ['50 employees', '50 people', 'cinquante', 'fifty'],
          },
          validation: {
            min: 1,
            max: 10000,
          },
          placeholder: 'e.g., 50',
        },
        {
          id: 'vehicle_count',
          label: 'Company Vehicles',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['vehicles', 'cars', 'fleet', 'véhicules', 'voitures'],
            aliases: ['camions', 'trucks', 'company cars'],
            examples: ['10 vehicles', '10 cars', 'dix voitures', 'ten vehicles'],
          },
          validation: {
            min: 0,
            max: 1000,
          },
          placeholder: 'e.g., 10',
          helpText: 'Number of company-owned vehicles',
        },
        {
          id: 'electricity_kwh',
          label: 'Monthly Electricity Consumption (kWh)',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['electricity', 'power', 'energy', 'kWh', 'électricité', 'consommation'],
            aliases: ['consumption', 'usage'],
            format: 'number',
            examples: ['5000 kWh/month', '5000 kilowatt-hours', '5000', 'five thousand'],
          },
          validation: {
            min: 100,
            max: 100000,
          },
          placeholder: 'e.g., 5000',
          helpText: 'Average monthly electricity consumption in kWh',
        },
        {
          id: 'waste_tons',
          label: 'Annual Waste Production (tons)',
          type: 'number',
          required: false,
          extraction: {
            keywords: ['waste', 'garbage', 'trash', 'déchets', 'tons', 'tonnes'],
            aliases: ['ordures', 'rubbish'],
            examples: ['50 tons', '50 tonnes', 'cinquante', 'fifty tons per year'],
          },
          validation: {
            min: 0,
            max: 10000,
          },
          placeholder: 'e.g., 50',
          helpText: 'Total waste production per year in tons',
        },
      ],
    },

    modes: {
      manual: true,
      chat: true,
      vocal: true,
      autoSubmit: true,
    },

    ui: {
      theme: 'blue',
      layout: 'wizard',
      showProgress: true,
      showPreview: false,
    },

    submitEndpoint: '/api/reports/carbon/submit',

    tags: ['carbon', 'emissions', 'report', 'mandatory', 'environment'],
    version: '1.0.0',
  },

  // ==================== WASTE REDUCTION PLAN ====================
  {
    id: 'waste-reduction-2025',
    name: 'Waste Reduction Action Plan',
    description: 'Develop a waste reduction strategy for your organization. Set goals and track progress towards zero waste.',
    category: 'declaration',
    icon: '♻️',

    extraction: {
      systemPrompt: `You are helping an organization create a waste reduction action plan.
Extract information about current waste levels, reduction goals, and planned actions.
Be encouraging and help them set realistic but ambitious targets.`,

      fields: [
        {
          id: 'current_waste',
          label: 'Current Annual Waste (kg)',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['current', 'waste', 'kg', 'kilograms', 'actuel', 'déchets'],
            aliases: ['how much waste', 'waste production'],
            examples: ['5000 kg', '5 tons', '5000 kilos'],
          },
          validation: {
            min: 0,
          },
          placeholder: 'e.g., 5000',
        },
        {
          id: 'reduction_target',
          label: 'Reduction Target (%)',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['target', 'goal', 'reduce', 'reduction', 'objectif', '%'],
            aliases: ['aim to reduce', 'want to reduce'],
            examples: ['30%', '30 percent', 'reduce by 30'],
          },
          validation: {
            min: 5,
            max: 100,
          },
          placeholder: 'e.g., 30',
          helpText: 'Percentage reduction goal',
        },
        {
          id: 'timeline_months',
          label: 'Timeline (months)',
          type: 'number',
          required: true,
          extraction: {
            keywords: ['timeline', 'months', 'time', 'mois', 'délai'],
            aliases: ['how long', 'duration'],
            examples: ['12 months', '1 year', 'one year'],
          },
          validation: {
            min: 3,
            max: 60,
          },
          placeholder: 'e.g., 12',
        },
        {
          id: 'actions',
          label: 'Planned Actions',
          type: 'textarea',
          required: true,
          extraction: {
            keywords: ['actions', 'plan', 'strategy', 'measures', 'actions'],
            aliases: ['what will you do', 'how'],
            examples: ['recycling program', 'composting', 'reduce packaging'],
          },
          placeholder: 'Describe your planned actions...',
          helpText: 'List the main actions you will take',
        },
      ],
    },

    modes: {
      manual: true,
      chat: true,
      vocal: false,
      autoSubmit: false,
    },

    ui: {
      theme: 'green',
      layout: 'single-column',
      showProgress: true,
      showPreview: true,
    },

    tags: ['waste', 'reduction', 'recycling', 'sustainability'],
    version: '1.0.0',
  },
]
