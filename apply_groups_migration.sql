-- Test migration for groups feature
-- Apply the migration manually in Supabase Dashboard
-- SQL Editor > New Query > Paste this content > Run

-- Create athlete_groups table
CREATE TABLE IF NOT EXISTS public.athlete_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- hex color for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add group_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.athlete_groups(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_athlete_groups_manager_id ON public.athlete_groups(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON public.profiles(group_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.athlete_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for athlete_groups
CREATE POLICY "Managers can view their own groups" ON public.athlete_groups
    FOR SELECT USING (auth.uid() = manager_id);

CREATE POLICY "Managers can create groups" ON public.athlete_groups
    FOR INSERT WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update their own groups" ON public.athlete_groups
    FOR UPDATE USING (auth.uid() = manager_id);

CREATE POLICY "Managers can delete their own groups" ON public.athlete_groups
    FOR DELETE USING (auth.uid() = manager_id);

-- Athletes can view their group info
CREATE POLICY "Athletes can view their group" ON public.athlete_groups
    FOR SELECT USING (
        id IN (
            SELECT group_id FROM public.profiles 
            WHERE id = auth.uid() AND group_id IS NOT NULL
        )
    );

-- Update RLS policy for profiles to include group-based access
-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Athletes can view profiles in their group" ON public.profiles;

CREATE POLICY "Athletes can view profiles in their group" ON public.profiles
    FOR SELECT USING (
        -- Users can see their own profile
        auth.uid() = id
        OR
        -- Athletes can see other athletes in the same group
        (
            role = 'athlete' 
            AND group_id IS NOT NULL 
            AND group_id = (
                SELECT group_id FROM public.profiles 
                WHERE id = auth.uid() AND role = 'athlete'
            )
        )
        OR
        -- Managers can see all athletes under their management
        (
            manager_id = auth.uid()
        )
        OR
        -- Athletes can see their manager
        (
            role = 'manager' 
            AND id = (
                SELECT manager_id FROM public.profiles 
                WHERE id = auth.uid() AND role = 'athlete'
            )
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for athlete_groups
CREATE TRIGGER update_athlete_groups_updated_at 
    BEFORE UPDATE ON public.athlete_groups 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
