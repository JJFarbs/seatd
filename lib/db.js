// Server-side Supabase client (used only by API routes).
// The fallback values are Supabase *publishable* credentials — safe to ship in code by design;
// access control is enforced by row-level security rules in the database.
// Env vars still take priority if set (useful for pointing at a different project later).
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amfutwppsxzucqbdeysm.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zq3AQgXABCw0yI3GSv9wvw_6LB3BQIw';

export const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
