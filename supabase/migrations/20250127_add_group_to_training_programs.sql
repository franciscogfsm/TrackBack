-- Add group_id to training_programs table
ALTER TABLE training_programs 
ADD COLUMN group_id text;

-- Add index for better query performance
CREATE INDEX idx_training_programs_group_id ON training_programs(group_id);

-- Add comment to explain the field
COMMENT ON COLUMN training_programs.group_id IS 'Group ID that this training program is assigned to. NULL means program is for all groups.';
