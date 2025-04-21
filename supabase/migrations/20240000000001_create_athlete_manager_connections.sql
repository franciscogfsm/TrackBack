-- Create athlete_manager_connections table
CREATE TABLE IF NOT EXISTS athlete_manager_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    invitation_id UUID REFERENCES manager_invitations(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(athlete_id, manager_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_athlete_manager_connections_athlete ON athlete_manager_connections(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_manager_connections_manager ON athlete_manager_connections(manager_id);

-- Enable RLS
ALTER TABLE athlete_manager_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Athletes can view their connections"
    ON athlete_manager_connections
    FOR SELECT
    TO authenticated
    USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can create connections"
    ON athlete_manager_connections
    FOR INSERT
    TO authenticated
    WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can manage their connections"
    ON athlete_manager_connections
    FOR UPDATE
    TO authenticated
    USING (athlete_id = auth.uid())
    WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Managers can view their athlete connections"
    ON athlete_manager_connections
    FOR SELECT
    TO authenticated
    USING (manager_id = auth.uid());

-- Grant access to authenticated users
GRANT ALL ON athlete_manager_connections TO authenticated; 