import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase";

export async function createSupabaseServerClient(): Promise<{
  client: SupabaseClient;
  accessToken: string | null;
}> {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const accessToken = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : null;

  if (accessToken) {
    return {
      accessToken,
      client: createClient(getSupabaseUrl(), getSupabaseKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      }),
    };
  }

  const cookieStore = await cookies();
  return {
    accessToken: null,
    client: createServerClient(getSupabaseUrl(), getSupabaseKey(), {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const cookie of cookiesToSet) {
              cookieStore.set(cookie.name, cookie.value, cookie.options);
            }
          } catch {
            // Server Components cannot always write refreshed cookies. Route
            // handlers and Server Actions can, and the user is still verified
            // through getUser for the current request.
          }
        },
      },
    }),
  };
}
