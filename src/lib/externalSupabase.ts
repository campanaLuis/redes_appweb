import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://ejrgdoiilyhthbwfxxxk.supabase.co';
const EXTERNAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcmdkb2lpbHlodGhid2Z4eHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTEzNjcsImV4cCI6MjA4NDQyNzM2N30.TtYbhaRUcZ7nmK_MqQf2ri3e2CBPLp0WJSJzOzMrFZM';

export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_ANON_KEY
);
