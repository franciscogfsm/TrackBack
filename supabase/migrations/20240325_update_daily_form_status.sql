-- Add reminder-related columns to daily_form_status table
ALTER TABLE daily_form_status
ADD COLUMN IF NOT EXISTS global_reminder_time TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS enable_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5]; -- Monday to Friday

-- Add comment to explain the columns
COMMENT ON COLUMN daily_form_status.global_reminder_time IS 'The time of day when reminders should be sent (in manager''s timezone)';
COMMENT ON COLUMN daily_form_status.enable_reminders IS 'Whether reminders are enabled for this manager''s athletes';
COMMENT ON COLUMN daily_form_status.last_reminder_sent IS 'Timestamp of when the last reminder was sent';
COMMENT ON COLUMN daily_form_status.reminder_days IS 'Array of days when reminders should be sent (1=Monday, 7=Sunday)';

-- Create an index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_daily_form_status_reminder 
ON daily_form_status(global_reminder_time) 
WHERE enable_reminders = true; 