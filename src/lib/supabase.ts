// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Для отладки - покажем все переменные
console.log('Environment check:', {
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing',
  allEnvKeys: Object.keys(import.meta.env)
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL is missing!');
  console.error('Available env vars:', Object.keys(import.meta.env));
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable. ' +
    'Please check your .env file in the project root.'
  );
}

if (!supabaseAnonKey) {
  console.error('VITE_SUPABASE_ANON_KEY is missing!');
  console.error('Available env vars:', Object.keys(import.meta.env));
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Please check your .env file in the project root.'
  );
}

console.log('✅ Supabase initialized successfully');
export const supabase = createClient(supabaseUrl, supabaseAnonKey);