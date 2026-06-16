import { createClient } from "@/lib/supabase/server";

export interface AcademySettings {
  id: string;
  name: string;
  logo_url: string | null;
  tagline: string;
  primary_color: string;
  footer_text: string | null;
  website_url: string | null;
  support_email: string | null;
}

const defaults: AcademySettings = {
  id: "",
  name: "ExamHub",
  logo_url: null,
  tagline: "Modern Online Exam Platform",
  primary_color: "#4f46e5",
  footer_text: null,
  website_url: null,
  support_email: null,
};

export async function getAcademySettings(): Promise<AcademySettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("academy_settings")
      .select("id, name, logo_url, tagline, primary_color, footer_text, website_url, support_email")
      .limit(1)
      .single();
    if (data) return { ...defaults, ...data } as AcademySettings;
  } catch {
    // table may not exist yet
  }
  return defaults;
}
