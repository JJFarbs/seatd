'use client';
// Browser-side Supabase client — handles auth sessions (stored in the browser)
// and direct reads/writes that row-level security allows for the logged-in user.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amfutwppsxzucqbdeysm.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zq3AQgXABCw0yI3GSv9wvw_6LB3BQIw';

export const sb = createClient(url, key);
