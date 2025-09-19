import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Profile, ExtractedFields } from '@/lib/types'
import { EnrichButton } from '@/components/EnrichButton'
import { Button } from '@/components/ui/button'
import { 
  ExternalLink, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Building, 
  MapPin, 
  GraduationCap,
  Briefcase,
  Award
} from 'lucide-react'

const ProfileRow: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const extractedData = profile.enriched_data as ExtractedFields | null

  const getSummary = () => {
    if (!extractedData) return null
    
    return {
      experience_count: extractedData.experience?.length || 0,
      education_count: extractedData.education?.length || 0,
      skills_count: extractedData.skills?.length || 0
    }
  }

  const summary = getSummary()

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {profile.enriched_status === 'success' && extractedData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 h-6 w-6"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            <div>
              <div className="font-medium">
                {extractedData?.full_name || profile.name || 'Unknown'}
              </div>
              {extractedData?.headline && (
                <div className="text-sm text-gray-600">{extractedData.headline}</div>
              )}
            </div>
          </div>
        </td>
        
        <td className="px-4 py-3">
          <div>
            <div className="font-medium">
              {extractedData?.current_position || profile.title || '-'}
            </div>
            {extractedData?.current_company && (
              <div className="text-sm text-gray-600 flex items-center gap-1">
                <Building className="h-3 w-3" />
                {extractedData.current_company}
              </div>
            )}
          </div>
        </td>
        
        <td className="px-4 py-3">
          <a 
            href={profile.linkedin_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
          >
            LinkedIn
            <ExternalLink className="h-3 w-3" />
          </a>
        </td>
        
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              profile.enriched_status === 'success' ? 'bg-green-100 text-green-800' :
              profile.enriched_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
              profile.enriched_status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {profile.enriched_status}
            </span>
            
            {summary && profile.enriched_status === 'success' && (
              <div className="text-xs text-gray-600">
                {summary.experience_count} exp, {summary.education_count} edu, {summary.skills_count} skills
              </div>
            )}
          </div>
          
          {profile.enriched_at && (
            <div className="text-xs text-gray-500 mt-1">
              {new Date(profile.enriched_at).toLocaleDateString()}
            </div>
          )}
        </td>
        
        <td className="px-4 py-3">
          <EnrichButton profile={profile} size="sm" />
        </td>
      </tr>
      
      {isExpanded && extractedData && (
        <tr>
          <td colSpan={5} className="px-4 py-4 bg-gray-50">
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    {extractedData.email && (
                      <div>Email: <span className="text-blue-600">{extractedData.email}</span></div>
                    )}
                    {extractedData.phone && (
                      <div>Phone: {extractedData.phone}</div>
                    )}
                    {extractedData.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {extractedData.location}
                      </div>
                    )}
                    {extractedData.connections_count && (
                      <div>Connections: {extractedData.connections_count.toLocaleString()}</div>
                    )}
                  </div>
                </div>
                
                {extractedData.skills && extractedData.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Skills ({extractedData.skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {extractedData.skills.slice(0, 10).map((skill, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {extractedData.skills.length > 10 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{extractedData.skills.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Experience */}
              {extractedData.experience && extractedData.experience.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Experience ({extractedData.experience.length})
                  </h4>
                  <div className="space-y-2">
                    {extractedData.experience.slice(0, 3).map((exp, index) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-3">
                        <div className="font-medium">{exp.title}</div>
                        <div className="text-sm text-gray-600">{exp.company}</div>
                        {(exp.start_date || exp.end_date) && (
                          <div className="text-xs text-gray-500">
                            {exp.start_date} - {exp.end_date || 'Present'}
                          </div>
                        )}
                      </div>
                    ))}
                    {extractedData.experience.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{extractedData.experience.length - 3} more positions
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Education */}
              {extractedData.education && extractedData.education.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Education ({extractedData.education.length})
                  </h4>
                  <div className="space-y-2">
                    {extractedData.education.map((edu, index) => (
                      <div key={index} className="border-l-2 border-green-200 pl-3">
                        <div className="font-medium">{edu.school}</div>
                        {edu.degree && (
                          <div className="text-sm text-gray-600">{edu.degree}</div>
                        )}
                        {edu.field && (
                          <div className="text-sm text-gray-600">{edu.field}</div>
                        )}
                        {(edu.start_date || edu.end_date) && (
                          <div className="text-xs text-gray-500">
                            {edu.start_date} - {edu.end_date}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export const Profiles: React.FC = () => {
  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ['profiles'],
    queryFn: api.getProfiles,
    refetchInterval: 5000, // Refetch every 5 seconds to catch status updates
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading profiles...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">
          Error loading profiles: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    )
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">No profiles found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">LinkedIn Profiles</h1>
        <p className="text-gray-600">
          Manage and enrich LinkedIn profiles with Bright Data
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                LinkedIn
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrichment Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <ProfileRow key={profile.id} profile={profile} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
