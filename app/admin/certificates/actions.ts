"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveCertificateTemplate(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();
  await supabase.from("certificate_templates").insert({
    name: (formData.get("name") as string)?.trim(),
    logo_url: (formData.get("logo_url") as string)?.trim() || null,
    signature_url: (formData.get("signature_url") as string)?.trim() || null,
    signer_name: (formData.get("signer_name") as string)?.trim() || null,
    signer_title: (formData.get("signer_title") as string)?.trim() || null,
    primary_color: (formData.get("primary_color") as string) || "#4f46e5",
    created_by: profile.id,
  });
  revalidatePath("/admin/certificates");
}
