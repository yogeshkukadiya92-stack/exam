import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Role = "super_admin" | "teacher" | "student";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
}

/** Get the current logged-in user's profile (or null). */
export async function getProfile(): Promise<Profile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/** Require login. Redirects to /login if not authed. */
export async function requireUser(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Require admin (super_admin or teacher). */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (profile.role !== "super_admin" && profile.role !== "teacher") {
    redirect("/student");
  }
  return profile;
}

/** Require student. */
export async function requireStudent(): Promise<Profile> {
  const profile = await requireUser();
  if (profile.role !== "student") redirect("/admin");
  return profile;
}

export function isAdmin(role: Role) {
  return role === "super_admin" || role === "teacher";
}
