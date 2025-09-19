import { z } from 'zod'

// Zod schemas for validation
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  title: z.string().nullable(),
  linkedin_url: z.string().url(),
  enriched_data: z.record(z.any()).nullable(),
  enriched_provider: z.string().nullable(),
  enriched_status: z.enum(['never', 'pending', 'processing', 'success', 'failed']),
  enriched_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const EnrichmentJobSchema = z.object({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  provider: z.string(),
  requested_at: z.string().datetime(),
  started_at: z.string().datetime().nullable(),
  finished_at: z.string().datetime().nullable(),
  status: z.enum(['queued', 'running', 'success', 'failed']),
  request_payload_summary: z.string().nullable(),
  response_payload_excerpt: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
})

export const ExtractedFieldsSchema = z.object({
  full_name: z.string().optional(),
  headline: z.string().optional(),
  current_position: z.string().optional(),
  current_company: z.string().optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().optional(),
    field: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  })).optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string().optional(),
  })).optional(),
  connections_count: z.number().optional(),
  profile_url: z.string().url().optional(),
  photo_url: z.string().url().optional(),
})

export const EnrichmentRequestSchema = z.object({
  profile_id: z.string().uuid(),
  options: z.object({
    dry_run: z.boolean().optional(),
    force: z.boolean().optional(),
    fields: z.array(z.string()).optional(),
    provider_options: z.record(z.any()).optional(),
  }).optional(),
})

export const EnrichmentResponseSchema = z.object({
  status: z.enum(['success', 'failed']),
  profile_id: z.string().uuid(),
  brief: z.object({
    experience_count: z.number(),
    education_count: z.number(),
    skills_count: z.number(),
  }).optional(),
  enriched_at: z.string().datetime().optional(),
  processing_time_ms: z.number().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
})

// TypeScript types derived from schemas
export type Profile = z.infer<typeof ProfileSchema>
export type EnrichmentJob = z.infer<typeof EnrichmentJobSchema>
export type ExtractedFields = z.infer<typeof ExtractedFieldsSchema>
export type EnrichmentRequest = z.infer<typeof EnrichmentRequestSchema>
export type EnrichmentResponse = z.infer<typeof EnrichmentResponseSchema>

// UI-specific types
export type ProfileWithSummary = Profile & {
  summary?: {
    experience_count: number
    education_count: number
    skills_count: number
  }
}

export type EnrichmentStatus = Profile['enriched_status']
