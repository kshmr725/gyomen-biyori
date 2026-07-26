import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { forbidden, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CmsRole = "editor" | "admin";

export type CmsActor = {
  client: SupabaseClient;
  role: CmsRole;
  user: User;
};

export type CmsAuthResult =
  | { kind: "anonymous"; client: SupabaseClient }
  | { kind: "viewer"; client: SupabaseClient; user: User }
  | { kind: "cms"; actor: CmsActor };

export async function getCmsAuth(): Promise<CmsAuthResult> {
  const { client, accessToken } = await createSupabaseServerClient();
  const { data, error } = accessToken
    ? await client.auth.getUser(accessToken)
    : await client.auth.getUser();

  if (error || !data.user) return { kind: "anonymous", client };

  const { data: profile } = await client
    .from("admin_profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role !== "editor" && profile?.role !== "admin") {
    return { kind: "viewer", client, user: data.user };
  }

  return {
    kind: "cms",
    actor: {
      client,
      role: profile.role,
      user: data.user,
    },
  };
}

export async function requireCmsActor(nextPath: string): Promise<CmsActor> {
  const auth = await getCmsAuth();
  if (auth.kind === "anonymous") {
    redirect(`/?auth=required&next=${encodeURIComponent(nextPath)}`);
  }
  if (auth.kind === "viewer") forbidden();
  return auth.actor;
}
