import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbvysisuzqveiytxcqir.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidnlzaXN1enF2ZWl5dHhjcWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1Mjg2MTUsImV4cCI6MjA0OTEwNDYxNX0.MFgEO8tH6MDyOzbDKNw2VKIejjCNbIovdc33a9gOvn0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);