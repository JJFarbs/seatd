// Server-side Supabase client (used only by API routes).
// If the env vars aren't set, `db` is null and the app falls back to in-memory demo data.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
