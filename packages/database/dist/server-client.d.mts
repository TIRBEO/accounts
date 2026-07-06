import * as _supabase_supabase_js from '@supabase/supabase-js';
import { cookies } from 'next/headers';

declare function createServerSideClient(cookieStore: ReturnType<typeof cookies>): _supabase_supabase_js.SupabaseClient<any, "public", any, any, any>;

export { createServerSideClient };
