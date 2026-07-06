import * as _supabase_supabase_js from '@supabase/supabase-js';

declare function createMiddlewareClient(request: Request): {
    supabase: _supabase_supabase_js.SupabaseClient<any, "public", any, any, any>;
    response: Response;
};

export { createMiddlewareClient };
