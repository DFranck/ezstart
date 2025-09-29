import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// Company Schema
export const CompanySchema = z.object({
  name: z.string().describe('Company name'),
  country: z.string().length(2, 'Country code must be 2 letters').describe('ISO 2-letter country code'),
  sector: z.string().describe('Business sector or industry'),
}).openapi({ title: 'Company Information' })

export type Company = z.infer<typeof CompanySchema>

// Site Schema
export const SiteSchema = z.object({
  site_id: z.string(),
  name: z.string(),
  address: z.string().optional(),
})

export type Site = z.infer<typeof SiteSchema>

// Scope 1 - Direct Emissions
export const Scope1ItemSchema = z.object({
  asset_id: z.string(),
  asset_type: z.enum(['diesel_generator', 'gas_boiler', 'company_vehicle', 'other']),
  fuel_l: z.number().min(0).optional(),
  fuel_kg: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export type Scope1Item = z.infer<typeof Scope1ItemSchema>

// Scope 2 - Indirect Emissions (electricity)
export const Scope2ItemSchema = z.object({
  site_id: z.string(),
  electricity_kwh: z.number().min(0),
  meter_id: z.string().optional(),
  period: z.string().optional(),
})

export type Scope2Item = z.infer<typeof Scope2ItemSchema>

// Scope 3 - Value Chain Emissions
export const Scope3ItemSchema = z.object({
  category: z.enum([
    'purchased_goods',
    'capital_goods',
    'fuel_energy',
    'upstream_transport',
    'waste',
    'business_travel',
    'employee_commute',
    'downstream_transport',
    'use_of_products',
    'end_of_life',
    'investments',
  ]),
  spend_usd: z.number().min(0).optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  desc: z.string().optional(),
})

export type Scope3Item = z.infer<typeof Scope3ItemSchema>

// Scopes Container
export const ScopesSchema = z.object({
  scope1: z.array(Scope1ItemSchema).default([]),
  scope2: z.array(Scope2ItemSchema).default([]),
  scope3: z.array(Scope3ItemSchema).default([]),
})

export type Scopes = z.infer<typeof ScopesSchema>

// Targets
export const TargetsSchema = z.object({
  energy_saving_pct: z.number().min(0).max(100).optional(),
  co2e_reduction_t: z.number().min(0).optional(),
  renewable_energy_pct: z.number().min(0).max(100).optional(),
  target_year: z.number().min(2025).max(2050).optional(),
})

export type Targets = z.infer<typeof TargetsSchema>

// Evidence
export const EvidenceSchema = z.object({
  invoices: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
  documents: z.array(z.string()).default([]),
})

export type Evidence = z.infer<typeof EvidenceSchema>

// Main ESG Payload Schema
export const ESGPayloadSchema = z.object({
  company: CompanySchema.describe('Company information'),
  sites: z.array(SiteSchema).default([]).describe('Company sites and facilities'),
  period: z.string().regex(/^\d{4}(-Q[1-4]|-\d{2})?$/, 'Period must be YYYY, YYYY-QN, or YYYY-MM').describe('Reporting period'),
  scopes: ScopesSchema.describe('GHG emissions data by scope'),
  targets: TargetsSchema.optional().describe('Sustainability targets and goals'),
  evidence: EvidenceSchema.optional().describe('Supporting documents and evidence'),
  _missing: z.array(z.string()).optional().describe('List of missing required fields'),
}).openapi({ title: 'ESG Data Payload' })

export type ESGPayload = z.infer<typeof ESGPayloadSchema>

// ESG Report Status
export const ESGReportStatusSchema = z.object({
  job_id: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100).optional(),
  report_url: z.string().url().optional(),
  error: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type ESGReportStatus = z.infer<typeof ESGReportStatusSchema>

// Validation Result
export const ValidationResultSchema = z.object({
  ok: z.boolean(),
  errors: z.array(z.string()).optional(),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>