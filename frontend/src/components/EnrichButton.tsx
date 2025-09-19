import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/button'
import { api } from '@/lib/api'
import { Profile, EnrichmentStatus } from '@/lib/types'
import { Loader2, Sparkles, CheckCircle, XCircle, Clock } from 'lucide-react'

interface EnrichButtonProps {
  profile: Profile
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  showStatus?: boolean
}

const getStatusIcon = (status: EnrichmentStatus) => {
  switch (status) {
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin" />
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />
    default:
      return <Sparkles className="h-4 w-4" />
  }
}

const getStatusText = (status: EnrichmentStatus, enrichedAt?: string | null) => {
  switch (status) {
    case 'processing':
      return 'Processing...'
    case 'success':
      return enrichedAt ? `Enriched ${new Date(enrichedAt).toLocaleDateString()}` : 'Enriched'
    case 'failed':
      return 'Failed'
    case 'pending':
      return 'Pending'
    default:
      return 'Enrich'
  }
}

const isRecentlyEnriched = (status: EnrichmentStatus, enrichedAt?: string | null): boolean => {
  if (status !== 'success' || !enrichedAt) return false
  
  const enrichedDate = new Date(enrichedAt)
  const now = new Date()
  const hoursSince = (now.getTime() - enrichedDate.getTime()) / (1000 * 60 * 60)
  
  return hoursSince < 24
}

export const EnrichButton: React.FC<EnrichButtonProps> = ({ 
  profile, 
  variant = 'default',
  size = 'default',
  showStatus = true 
}) => {
  const queryClient = useQueryClient()

  const enrichMutation = useMutation({
    mutationFn: (options: { force?: boolean } = {}) => 
      api.enrichProfile({ 
        profile_id: profile.id, 
        options 
      }),
    onSuccess: () => {
      // Invalidate and refetch profiles
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['profile', profile.id] })
    },
    onError: (error) => {
      console.error('Enrichment failed:', error)
    }
  })

  const handleEnrich = (force = false) => {
    enrichMutation.mutate({ force })
  }

  const isDisabled = profile.enriched_status === 'processing' || 
                    enrichMutation.isPending ||
                    (isRecentlyEnriched(profile.enriched_status, profile.enriched_at) && !enrichMutation.isError)

  const buttonText = enrichMutation.isPending 
    ? 'Processing...' 
    : getStatusText(profile.enriched_status, profile.enriched_at)

  const buttonIcon = enrichMutation.isPending 
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : getStatusIcon(profile.enriched_status)

  // Show force option if recently enriched
  const showForceOption = isRecentlyEnriched(profile.enriched_status, profile.enriched_at) && 
                         !enrichMutation.isPending && 
                         profile.enriched_status !== 'processing'

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        disabled={isDisabled}
        onClick={() => handleEnrich(false)}
        className="flex items-center gap-2"
      >
        {buttonIcon}
        {showStatus && buttonText}
      </Button>
      
      {showForceOption && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEnrich(true)}
          className="flex items-center gap-1"
        >
          <Sparkles className="h-3 w-3" />
          Force
        </Button>
      )}
      
      {enrichMutation.isError && (
        <div className="text-sm text-red-600">
          {enrichMutation.error instanceof Error 
            ? enrichMutation.error.message 
            : 'Enrichment failed'}
        </div>
      )}
    </div>
  )
}
