import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Role = "super_admin" | "teacher" | "student";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
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
    .select("id, full_name, email, phone, role")
    .eq("id", user.id)
    .single();

  if (data) return data as Profile;

  // Profile row is missing, so auto-create it from auth metadata.
  const meta = user.user_metadata ?? {};
  const newProfile: Profile = {
    id: user.id,
    full_name: (meta.full_name as string) || null,
    email: user.email || null,
    phone: (meta.phone as string) || null,
    role: (meta.role as Role) || "student",
  };

  const { error: insertError } = await supabase.from("profiles").insert(newProfile);

  // If insert failed (e.g. profile exists but RLS blocked SELECT), re-fetch
  if (insertError) {
    const { data: retry } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, role")
      .eq("id", user.id)
      .single();
    if (retry) return retry as Profile;
  }

  return newProfile;
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

export function isSuperAdmin(role: Role) {
  return role === "super_admin";
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (profile.role !== "super_admin") redirect("/admin");
  return profile;
}
