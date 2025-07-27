-- Create training_programs table
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_a_exercises TEXT[] NOT NULL DEFAULT '{}',
  plan_b_exercises TEXT[] NOT NULL DEFAULT '{}',
  group_id UUID REFERENCES athlete_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_training_programs_manager_id ON training_programs(manager_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_group_id ON training_programs(group_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_is_active ON training_programs(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Managers can only see their own training programs
CREATE POLICY "Managers can view own training programs" ON training_programs
  FOR SELECT USING (manager_id = auth.uid());

-- Managers can insert their own training programs
CREATE POLICY "Managers can insert own training programs" ON training_programs
  FOR INSERT WITH CHECK (manager_id = auth.uid());

-- Managers can update their own training programs
CREATE POLICY "Managers can update own training programs" ON training_programs
  FOR UPDATE USING (manager_id = auth.uid());

-- Managers can delete their own training programs
CREATE POLICY "Managers can delete own training programs" ON training_programs
  FOR DELETE USING (manager_id = auth.uid());

-- Athletes can view training programs assigned to their group or to all groups
CREATE POLICY "Athletes can view assigned training programs" ON training_programs
  FOR SELECT USING (
    group_id IS NULL OR 
    group_id IN (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'athlete'
    )
  );



-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_training_programs_updated_at
    BEFORE UPDATE ON training_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
