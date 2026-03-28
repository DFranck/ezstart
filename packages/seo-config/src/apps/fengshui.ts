/**
 * Enhanced SEO Configuration for FengShui
 *
 * Upload floor plan, set cardinal directions, get personalized Feng Shui analysis based on birth year.
 * Data extracted from docs/seo/ALL-APPS-SUMMARY.md
 */

import type { AppSEOConfig } from './ezstart'

export const fengshuiSEO: AppSEOConfig = {
  appName: 'FengShui Analyzer',
  tagline: 'Ancient Wisdom Meets Modern Technology',
  shortDescription: 'Upload your floor plan, get personalized Feng Shui analysis based on your birth year.',
  longDescription: `FengShui Analyzer makes ancient Feng Shui wisdom accessible through modern technology. Upload your floor plan, set cardinal directions (North, South, East, West), enter your birth year, and receive a comprehensive personalized Feng Shui analysis instantly. Built for Feng Shui practitioners, interior designers, homeowners planning renovations, and real estate professionals, the app combines traditional Flying Stars Feng Shui calculations with beautiful visualizations. Upload any floor plan image (house, apartment, office), set compass directions accurately, enter birth year for personalized Bagua mapping, and receive detailed analysis with recommendations. The system calculates your personal Kua number, maps the nine Bagua sectors to your space, applies Flying Stars formulas for temporal influences, identifies auspicious and inauspicious areas, and provides actionable remedies and enhancements. Export comprehensive PDF reports with floor plan overlay, Bagua mapping, sector analysis, lucky/unlucky areas marked, and personalized recommendations. Unlike hiring a Feng Shui consultant for $500+ and waiting weeks, get instant analysis for free. Unlike generic Bagua tools, calculations are personalized to your birth year. Unlike complex Feng Shui software requiring expertise, our interface is intuitive for anyone. Perfect for homeowners optimizing their living space, real estate agents adding value for clients, interior designers incorporating Feng Shui principles, and practitioners providing client analyses.`,

  mission: {
    what: 'Floor plan analysis tool providing personalized Feng Shui analysis based on birth year.',
    why: 'Feng Shui consultation is expensive ($500+) and time-consuming (weeks). Generic tools don\'t provide personalized analysis.',
    how: 'Combine traditional wisdom with modern tech for instant, personalized analysis.',
  },

  features: [
    {
      title: 'Floor Plan Analysis - Upload & Analyze Any Layout',
      description: 'Upload floor plan, set directions, get instant Feng Shui analysis',
      longDescription: 'Simply upload your floor plan (hand-drawn sketch, architect drawing, or photo of existing space), rotate and scale to match actual size, set cardinal directions using compass or knowledge of North, and the app analyzes your space. Supports any floor plan shape: rectangular, L-shaped, irregular. Works for houses, apartments, offices, commercial spaces. Floor plan overlay shows Bagua sectors mapped to your specific layout. Interactive visualization lets you explore each sector. No complex measurements needed - just upload and set direction.',
      icon: 'lucide:Home',
      keywords: ['floor plan feng shui', 'feng shui analysis', 'bagua mapping', 'floor plan upload', 'space analysis'],
      useCases: [
        'Homeowners analyzing their living space for optimization',
        'Real estate agents providing Feng Shui reports to buyers',
        'Interior designers incorporating Feng Shui into projects',
      ],
    },
    {
      title: 'Bagua Mapping - Personalized Based on Birth Year',
      description: 'Calculate personal Kua number and map Bagua sectors accordingly',
      longDescription: 'Feng Shui is not one-size-fits-all. Your birth year determines your Kua number (East or West group), which affects how Bagua sectors apply to you personally. The app calculates your Kua number from birth year, determines your auspicious directions (Sheng Chi, Tian Yi, Yan Nian, Fu Wei), identifies inauspicious directions (Huo Hai, Wu Gui, Liu Sha, Jue Ming), maps these to your floor plan sectors, and shows which areas are beneficial vs. challenging for YOU specifically. What\'s lucky for one person may be unlucky for another. Personalized analysis is what professional consultants charge $500+ for.',
      icon: 'lucide:Compass',
      keywords: ['bagua map', 'kua number', 'personal feng shui', 'birth year feng shui', 'feng shui directions'],
      useCases: [
        'Individuals optimizing bedroom location for better sleep',
        'Couples finding compatible spaces for shared living',
        'Practitioners providing accurate client consultations',
      ],
    },
    {
      title: 'PDF Reports - Professional Analysis Documents',
      description: 'Export comprehensive Feng Shui reports with visualizations',
      longDescription: 'Get professional PDF reports suitable for personal use or client presentation: floor plan with Bagua overlay showing all nine sectors, color-coded map of auspicious (green) and inauspicious (red) areas, detailed sector-by-sector analysis, personalized recommendations for each area (colors, elements, remedies), Flying Stars influences for current period, and actionable enhancement suggestions. Reports are beautifully designed, easy to understand, and include both overview and detailed sections. Perfect for presenting to family, clients, or contractors implementing changes.',
      icon: 'lucide:FileDown',
      keywords: ['feng shui report', 'pdf analysis', 'feng shui consultation', 'professional report', 'bagua report'],
      useCases: [
        'Homeowners sharing analysis with family for decisions',
        'Real estate professionals providing value-add reports',
        'Feng Shui practitioners delivering client analyses',
      ],
    },
  ],

  targetAudience: [
    {
      persona: 'Feng Shui Practitioners',
      painPoints: [
        'Manual calculations are time-consuming',
        'Creating client reports takes hours',
        'Need professional-looking deliverables',
        'Want to focus on consultation, not admin',
      ],
      goals: [
        'Faster analysis for more clients',
        'Professional PDF reports automatically',
        'Accurate calculations every time',
        'Spend time on consultation, not calculations',
      ],
      characteristics: [
        'Trained in Feng Shui principles',
        'Building consulting business',
        'Need efficient tools',
        'Value accuracy and professionalism',
      ],
    },
    {
      persona: 'Interior Designers',
      painPoints: [
        'Clients ask about Feng Shui',
        'Don\'t have expertise to advise',
        'Hiring consultants is expensive',
        'Want to add value to services',
      ],
      goals: [
        'Incorporate Feng Shui into designs',
        'Provide basic Feng Shui guidance',
        'Differentiate from competitors',
        'Charge premium for added value',
      ],
      characteristics: [
        'Design professionals',
        'Some Feng Shui knowledge',
        'Client-service focused',
        'Want additional revenue streams',
      ],
    },
    {
      persona: 'Homeowners Planning Renovations',
      painPoints: [
        'Consulta费用500+美元太贵',
        'Want to optimize home energy',
        'Confused by conflicting Feng Shui advice',
        'Need personalized recommendations',
      ],
      goals: [
        'Optimize home for better energy',
        'Make informed renovation decisions',
        'Get personalized (not generic) advice',
        'Save money on consultants',
      ],
      characteristics: [
        'Interested in Feng Shui',
        'Planning home changes',
        'Budget-conscious',
        'Want data to make decisions',
      ],
    },
  ],

  useCases: [
    {
      title: 'Homeowner: DIY Feng Shui Analysis',
      before: 'Hired consultant for $500, waited 2 weeks for basic analysis. Got generic Bagua map not specific to my birth year. Had questions but followup was expensive.',
      after: 'Uploaded floor plan, entered birth year, got detailed personalized Bagua map in 5 minutes. PDF report explained everything. Saved $500 and got instant results.',
      metrics: {
        costBefore: '$500',
        costAfter: '$0 (saved $500)',
        timelineBefore: '2 weeks',
        timelineAfter: '5 minutes',
      },
    },
    {
      title: 'Feng Shui Practitioner: Faster Client Service',
      before: 'Spent 2-3 hours per client doing calculations, creating floor plan overlays in Photoshop, writing reports in Word. Could only handle 3-4 clients per week.',
      after: 'Upload client floor plan, calculations automatic, PDF generated instantly. Spend time on consultation and recommendations. Now handle 10-12 clients per week, triple income.',
      metrics: {
        timelineBefore: '3 hrs per client',
        timelineAfter: '30 min per client',
        costBefore: '3-4 clients/week',
        costAfter: '10-12 clients/week (+200%)',
      },
    },
  ],

  keywords: {
    primary: [
      { term: 'feng shui calculator', volume: 1900 },
      { term: 'bagua map', volume: 2400 },
      { term: 'feng shui', volume: 246000 },
      { term: 'flying stars feng shui', volume: 1300 },
      { term: 'feng shui online', volume: 880 },
    ],
    secondary: [
      { term: 'kua number calculator', volume: 720 },
      { term: 'floor plan feng shui', volume: 480 },
      { term: 'personal feng shui', volume: 590 },
      { term: 'feng shui analysis tool', volume: 320 },
      { term: 'bagua calculator', volume: 390 },
    ],
    longTail: [
      { term: 'how to calculate feng shui directions', volume: 210 },
      { term: 'personalized bagua map free', volume: 140 },
      { term: 'feng shui floor plan analyzer', volume: 90 },
      { term: 'flying stars calculation online', volume: 70 },
      { term: 'feng shui birth year analysis', volume: 50 },
    ],
  },

  usps: {
    title: 'Professional Feng Shui Analysis in Minutes, Not Weeks',
    description: 'Ancient wisdom accessible through modern technology',
    differentiators: [
      'Personalized Analysis: Based on YOUR birth year (Kua number)',
      'Instant Results: Upload floor plan, get analysis in minutes',
      'Professional Reports: Beautiful PDF suitable for clients',
      'Flying Stars Integration: Temporal influences included',
      'Any Floor Plan: Supports irregular shapes and layouts',
      'Free vs $500+: Save hundreds compared to consultants',
      'No Expertise Needed: Intuitive interface for anyone',
      'Open Source: Transparent calculations you can verify',
    ],
  },

  vsCompetition: [
    {
      category: 'VS Feng Shui Consultants',
      competitors: ['Professional consultants ($500+)', 'Master practitioners ($1000+)'],
      ourAdvantage: 'Consultants charge $500-1000+ and take weeks. We provide instant analysis for free. Calculations are identical - same Flying Stars formulas. You get the analysis immediately, spend time on implementation instead of waiting.',
    },
    {
      category: 'VS Generic Bagua Tools',
      competitors: ['Generic Bagua apps', 'Online Bagua calculators'],
      ourAdvantage: 'Generic tools ignore your birth year and give one-size-fits-all advice. We calculate your personal Kua number and provide analysis specific to YOU. What\'s auspicious for one person is inauspicious for another.',
    },
  ],

  visualAssets: [
    {
      type: 'video',
      title: 'Analysis Demo',
      description: 'Upload floor plan → Set directions → Get personalized report',
      specs: {
        duration: '45 seconds',
        resolution: '1920×1080',
        format: 'MP4',
        size: '<8MB',
      },
    },
    {
      type: 'screenshot',
      title: 'Bagua Overlay',
      description: 'Floor plan with Bagua sectors mapped and color-coded',
      specs: {
        resolution: '1400×900',
        format: 'WebP',
      },
    },
    {
      type: 'screenshot',
      title: 'PDF Report Sample',
      description: 'Professional analysis report page',
      specs: {
        resolution: '800×1100',
        format: 'WebP',
      },
    },
  ],

  callToAction: {
    primary: 'Analyze Your Space',
    secondary: 'Upload Floor Plan',
    url: 'https://fengshui.ezstart.xyz',
  },

  socialProof: {
    stats: [
      { label: 'Analysis Time', value: '<5 min' },
      { label: 'Cost Savings', value: '$500+' },
      { label: 'Personalized', value: 'Birth year' },
      { label: 'Report Format', value: 'PDF' },
    ],
  },

  faq: [
    {
      question: 'How accurate are the Feng Shui calculations?',
      answer: 'We use traditional Flying Stars Feng Shui formulas that professional consultants use. Kua number calculation, Bagua mapping, and directional analysis follow classical methods. Same calculations, instant results.',
    },
    {
      question: 'Do I need to know my exact birth time?',
      answer: 'No, only birth year is needed for Kua number calculation. Birth time is used in advanced Chinese astrology (BaZi) but not for basic Feng Shui analysis.',
    },
    {
      question: 'Can I analyze multiple rooms or buildings?',
      answer: 'Yes, upload separate floor plans for each space. The app analyzes each independently. You can also analyze one room within a larger floor plan.',
    },
    {
      question: 'What if I don\'t know the exact cardinal directions?',
      answer: 'Use a compass app on your phone to find North, or check Google Maps satellite view to determine building orientation. Accurate directions are important for correct analysis.',
    },
    {
      question: 'Can Feng Shui practitioners use this for clients?',
      answer: 'Absolutely! Many practitioners use the tool to speed up calculations and generate professional PDF reports. Focus your time on consultation and recommendations, not manual calculations.',
    },
  ],

  brandVoice: {
    tone: [
      'Respectful of traditional wisdom',
      'Modern and accessible',
      'Educational without being preachy',
      'Practical and results-focused',
    ],
    avoid: [
      'Mysticism without substance',
      'Dismissing skeptics rudely',
      'Overpromising life changes',
      'Cultural appropriation concerns',
    ],
  },
}

export default fengshuiSEO
