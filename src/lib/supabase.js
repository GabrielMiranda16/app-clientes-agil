// Re-exports the single shared Supabase instance from customSupabaseClient
// so all files (regardless of which lib they import from) use the same client.
export { customSupabaseClient as supabaseClient } from './customSupabaseClient';
