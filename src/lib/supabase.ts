import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://hpkjhohxwaopmyinijos.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwa2pob2h4d2FvcG15aW5pam9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMDI4OTIsImV4cCI6MjEwMDU3ODzgOTJ9.S750T8b_-O4y2tP7wA-362sT_Lw0_Z5pL";

let client: SupabaseClient | null = null;

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

export function getSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createClient(getSupabaseUrl(), getSupabaseKey());
  }
  return client;
}
