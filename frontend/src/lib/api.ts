import { supabase } from './supabase'
import { 
  Profile, 
  EnrichmentRequest, 
  EnrichmentResponse, 
  ProfileSchema,
  EnrichmentResponseSchema 
} from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = {
  // Profile management
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new ApiError(`Failed to fetch profiles: ${error.message}`, 500)
    }

    // Validate and parse the response
    return data.map(profile => ProfileSchema.parse(profile))
  },

  async getProfile(id: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new ApiError(`Failed to fetch profile: ${error.message}`, 404)
    }

    return ProfileSchema.parse(data)
  },

  async createProfile(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'enriched_data' | 'enriched_provider' | 'enriched_status' | 'enriched_at'>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single()

    if (error) {
      throw new ApiError(`Failed to create profile: ${error.message}`, 400)
    }

    return ProfileSchema.parse(data)
  },

  // Enrichment
  async enrichProfile(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new ApiError('Authentication required', 401)
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.code
      )
    }

    const data = await response.json()
    return EnrichmentResponseSchema.parse(data)
  },

  // Utility functions
  async getEnrichmentJobs(profileId?: string) {
    let query = supabase
      .from('enrichment_jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (profileId) {
      query = query.eq('profile_id', profileId)
    }

    const { data, error } = await query

    if (error) {
      throw new ApiError(`Failed to fetch enrichment jobs: ${error.message}`, 500)
    }

    return data
  },

  // Real-time subscriptions
  subscribeToProfiles(callback: (profiles: Profile[]) => void) {
    return supabase
      .channel('profiles')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        async () => {
          // Refetch all profiles when any change occurs
          try {
            const profiles = await this.getProfiles()
            callback(profiles)
          } catch (error) {
            console.error('Failed to refetch profiles:', error)
          }
        }
      )
      .subscribe()
  },

  subscribeToProfile(profileId: string, callback: (profile: Profile) => void) {
    return supabase
      .channel(`profile-${profileId}`)
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${profileId}`
        },
        async (payload) => {
          try {
            const profile = ProfileSchema.parse(payload.new)
            callback(profile)
          } catch (error) {
            console.error('Failed to parse profile update:', error)
          }
        }
      )
      .subscribe()
  }
}
