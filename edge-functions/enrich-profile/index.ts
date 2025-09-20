import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnrichmentRequest {
  profile_id: string
  options?: {
    dry_run?: boolean
    force?: boolean
    fields?: string[]
    provider_options?: Record<string, any>
  }
}

interface BrightDataResponse {
  [key: string]: any
}

interface ExtractedFields {
  full_name?: string
  headline?: string
  current_position?: string
  current_company?: string
  location?: string
  country?: string
  email?: string
  phone?: string
  website?: string
  experience?: Array<{
    title: string
    company: string
    start_date?: string
    end_date?: string
    location?: string
    description?: string
  }>
  education?: Array<{
    school: string
    degree?: string
    field?: string
    start_date?: string
    end_date?: string
  }>
  skills?: string[]
  languages?: Array<{
    language: string
    proficiency?: string
  }>
  connections_count?: number
  profile_url?: string
  photo_url?: string
}

async function enrichProfileWithBrightData(linkedinUrl: string): Promise<BrightDataResponse> {
  const brightDataApiKey = Deno.env.get('BRIGHTDATA_API_KEY')
  const brightDataBaseUrl = Deno.env.get('BRIGHTDATA_BASE_URL') || 'https://api.brightdata.com'
  const brightDataCollectorId = Deno.env.get('BRIGHTDATA_COLLECTOR_ID')
  const brightDataAuthScheme = (Deno.env.get('BRIGHTDATA_AUTH_SCHEME') || 'Bearer').trim()
  const brightDataTriggerUrl = Deno.env.get('BRIGHTDATA_TRIGGER_URL')
  
  if (!brightDataApiKey) {
    throw new Error('BRIGHTDATA_API_KEY not configured')
  }
  if (!brightDataCollectorId || brightDataCollectorId === 'linkedin-profile') {
    throw new Error('BRIGHTDATA_COLLECTOR_ID not configured. Set it to your actual Bright Data collector/dataset ID.')
  }

  // Build request payload. Some Bright Data endpoints require dataset_id in body
  // when the trigger URL is generic (e.g., /datasets/v3/trigger), while others
  // include the ID in the path (/datasets/v3/{id}/trigger).
  const includeIdInBody = !!brightDataTriggerUrl && !brightDataTriggerUrl.includes(brightDataCollectorId!)
  const requestPayload: Record<string, any> = {
    url: linkedinUrl,
    format: 'json'
  }
  if (includeIdInBody) {
    requestPayload.dataset_id = brightDataCollectorId
  }

  const triggerUrl = brightDataTriggerUrl || `${brightDataBaseUrl}/datasets/v3/${brightDataCollectorId}/trigger`
  const response = await fetch(triggerUrl, {
    method: 'POST',
    headers: {
      'Authorization': `${brightDataAuthScheme} ${brightDataApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestPayload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Bright Data API error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

function extractFields(rawData: BrightDataResponse): ExtractedFields {
  // Map Bright Data response to our standardized fields
  // This mapping will need to be adjusted based on actual Bright Data response structure
  return {
    full_name: rawData.name || rawData.full_name,
    headline: rawData.headline || rawData.title,
    current_position: rawData.current_position?.title,
    current_company: rawData.current_position?.company,
    location: rawData.location?.name || rawData.location,
    country: rawData.location?.country,
    email: rawData.email,
    phone: rawData.phone,
    website: rawData.website,
    experience: rawData.experience?.map((exp: any) => ({
      title: exp.title,
      company: exp.company,
      start_date: exp.start_date,
      end_date: exp.end_date,
      location: exp.location,
      description: exp.description
    })),
    education: rawData.education?.map((edu: any) => ({
      school: edu.school,
      degree: edu.degree,
      field: edu.field,
      start_date: edu.start_date,
      end_date: edu.end_date
    })),
    skills: rawData.skills?.map((skill: any) => typeof skill === 'string' ? skill : skill.name),
    languages: rawData.languages?.map((lang: any) => ({
      language: typeof lang === 'string' ? lang : lang.language,
      proficiency: typeof lang === 'object' ? lang.proficiency : undefined
    })),
    connections_count: rawData.connections_count || rawData.connections,
    profile_url: rawData.profile_url || rawData.url,
    photo_url: rawData.photo_url || rawData.image
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const { profile_id, options = {} }: EnrichmentRequest = await req.json()

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile_id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.linkedin_url) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already processing
    if (profile.enriched_status === 'processing') {
      return new Response(
        JSON.stringify({ error: 'Profile is already being processed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if recently enriched and force not set
    if (profile.enriched_status === 'success' && profile.enriched_at && !options.force) {
      const enrichedAt = new Date(profile.enriched_at)
      const now = new Date()
      const hoursSinceEnrichment = (now.getTime() - enrichedAt.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceEnrichment < 24) {
        return new Response(
          JSON.stringify({ 
            message: 'Profile was recently enriched. Use force=true to override.',
            enriched_at: profile.enriched_at
          }),
          { status: 304, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create enrichment job record
    const { data: job, error: jobError } = await supabase
      .from('enrichment_jobs')
      .insert({
        profile_id,
        provider: 'brightdata',
        status: 'running',
        started_at: new Date().toISOString(),
        request_payload_summary: JSON.stringify({ linkedin_url: profile.linkedin_url, options })
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create enrichment job:', jobError)
    }

    // Mark profile as processing
    await supabase
      .from('profiles')
      .update({ 
        enriched_status: 'processing',
        enriched_provider: 'brightdata'
      })
      .eq('id', profile_id)

    try {
      // Return early if dry run
      if (options.dry_run) {
        await supabase
          .from('profiles')
          .update({ enriched_status: 'never' })
          .eq('id', profile_id)

        return new Response(
          JSON.stringify({ 
            status: 'success',
            profile_id,
            message: 'Dry run completed - no actual enrichment performed'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Call Bright Data API
      const startTime = Date.now()
      const rawData = await enrichProfileWithBrightData(profile.linkedin_url)
      const endTime = Date.now()

      // Extract standardized fields
      const extractedFields = extractFields(rawData)

      // Update profile with enriched data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          enriched_data: rawData,
          enriched_status: 'success',
          enriched_at: new Date().toISOString(),
          enriched_provider: 'brightdata'
        })
        .eq('id', profile_id)

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      // Update enrichment job
      if (job) {
        await supabase
          .from('enrichment_jobs')
          .update({
            status: 'success',
            finished_at: new Date().toISOString(),
            response_payload_excerpt: JSON.stringify(extractedFields).substring(0, 2000)
          })
          .eq('id', job.id)
      }

      // Return success response
      return new Response(
        JSON.stringify({
          status: 'success',
          profile_id,
          brief: {
            experience_count: extractedFields.experience?.length || 0,
            education_count: extractedFields.education?.length || 0,
            skills_count: extractedFields.skills?.length || 0
          },
          enriched_at: new Date().toISOString(),
          processing_time_ms: endTime - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('Enrichment error:', error)

      // Mark profile as failed
      await supabase
        .from('profiles')
        .update({ 
          enriched_status: 'failed'
        })
        .eq('id', profile_id)

      // Update enrichment job
      if (job) {
        await supabase
          .from('enrichment_jobs')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', job.id)
      }

      const statusCode = error.message.includes('API error') ? 502 : 500
      
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          profile_id,
          error: error.message 
        }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Request error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
