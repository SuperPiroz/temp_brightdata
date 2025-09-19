-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
-- Allow authenticated users to read profiles (can be restricted further based on business logic)
CREATE POLICY "Users can view profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to update enrichment-related fields
CREATE POLICY "Service role can update enrichment data" ON profiles
    FOR UPDATE USING (auth.role() = 'service_role');

-- Allow authenticated users to insert new profiles
CREATE POLICY "Users can insert profiles" ON profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for enrichment_jobs table
-- Allow authenticated users to read enrichment jobs
CREATE POLICY "Users can view enrichment jobs" ON enrichment_jobs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to insert and update enrichment jobs
CREATE POLICY "Service role can manage enrichment jobs" ON enrichment_jobs
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function that can be called by authenticated users but executes with elevated privileges
CREATE OR REPLACE FUNCTION enrich_profile_rpc(profile_id UUID, options JSONB DEFAULT '{}')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- This function will be called by the Edge Function
    -- It allows authenticated users to trigger enrichment while maintaining security
    
    -- Verify the profile exists and user has access
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = profile_id 
        AND (auth.role() = 'service_role' OR auth.role() = 'authenticated')
    ) THEN
        RAISE EXCEPTION 'Profile not found or access denied';
    END IF;
    
    -- Return success - actual enrichment logic will be in Edge Function
    result := jsonb_build_object(
        'success', true,
        'profile_id', profile_id,
        'message', 'Enrichment request accepted'
    );
    
    RETURN result;
END;
$$;
