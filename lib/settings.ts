import { createClient } from "@/lib/supabase/server";

export interface AcademySettings {
  id: string;
  name: string;
  logo_url: string | null;
  tagline: string;
  primary_color: string;
}

const defaults: AcademySettings = {
  id: "",
  name: "ExamHub",
  logo_url: null,
  tagline: "Modern Online Exam Platform",
  primary_color: "#4f46e5",
};

export async function getAcademySettings(): Promise<AcademySettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("academy_settings")
      .select("id, name, logo_url, tagline, primary_color")
      .limit(1)
      .single();
    if (data) return data as AcademySettings;
  } catch {
    // table may not exist yet
  }
  return defaults;
}
