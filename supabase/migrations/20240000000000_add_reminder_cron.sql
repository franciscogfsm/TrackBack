-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to trigger the send-reminders function every minute
SELECT cron.schedule(
  'check-and-send-reminders',  -- unique job name
  '* * * * *',                -- run every minute (cron expression)
  $$
  SELECT net.http_post(
    'https://' || (SELECT value FROM secrets.decrypted WHERE key = 'SUPABASE_URL') || '/functions/v1/send-reminders',
    '{}',
    'application/json',
    ARRAY[
      ('Authorization', 'Bearer ' || (SELECT value FROM secrets.decrypted WHERE key = 'SUPABASE_SERVICE_ROLE_KEY'))::http_header
    ]
  );
  $$
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres; 