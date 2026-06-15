import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/auth";

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  redirect(isAdmin(profile.role) ? "/admin" : "/student");
}
