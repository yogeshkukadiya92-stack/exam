import { createClient } from "@/lib/supabase/server";
import { saveCertificateTemplate } from "./actions";

export default async function CertificateTemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("certificate_templates")
    .select("id, name, logo_url, signature_url, signer_name, signer_title, primary_color, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="page-title">Certificate Templates</h1>
      <p className="mt-1 text-sm text-slate-500">Create reusable certificate branding.</p>

      <form action={saveCertificateTemplate} className="card my-6 grid gap-3 p-5 md:grid-cols-2">
        <input name="name" required placeholder="Template name" className="input" />
        <input name="primary_color" type="color" defaultValue="#4f46e5" className="input h-11" />
        <input name="logo_url" placeholder="Logo URL" className="input" />
        <input name="signature_url" placeholder="Signature URL" className="input" />
        <input name="signer_name" placeholder="Signer name" className="input" />
        <input name="signer_title" placeholder="Signer title" className="input" />
        <button className="btn-primary md:col-span-2">Create template</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {(templates ?? []).map((t) => (
          <div key={t.id} className="card p-5">
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded" style={{ backgroundColor: t.primary_color ?? "#4f46e5" }} />
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-slate-500">{t.signer_name || "No signer"} · {t.signer_title || "No title"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
