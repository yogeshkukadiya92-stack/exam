import { requireSuperAdmin } from "@/lib/auth";
import { getAcademySettings } from "@/lib/settings";
import { updateSettings } from "./actions";
import { Settings, Globe, Palette } from "lucide-react";

export default async function SettingsPage() {
  await requireSuperAdmin();
  const settings = await getAcademySettings();

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Academy Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Customize your academy branding and appearance
        </p>
      </div>

      <form action={updateSettings} className="grid gap-6 sm:grid-cols-2">
        {/* Branding */}
        <div className="card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="section-title">Branding</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Name, logo, and colors</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Academy Name
              </label>
              <input
                name="name"
                type="text"
                defaultValue={settings.name}
                required
                className="input"
                placeholder="ExamHub"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tagline
              </label>
              <input
                name="tagline"
                type="text"
                defaultValue={settings.tagline}
                className="input"
                placeholder="Modern Online Exam Platform"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Logo URL
              </label>
              <input
                name="logo_url"
                type="url"
                defaultValue={settings.logo_url ?? ""}
                className="input"
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Direct link to your logo image (PNG or SVG)
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  name="primary_color"
                  type="text"
                  defaultValue={settings.primary_color}
                  className="input"
                  placeholder="#4f46e5"
                  pattern="^#[0-9a-fA-F]{6}$"
                />
                <div
                  className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 dark:border-slate-600"
                  style={{ backgroundColor: settings.primary_color }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Footer */}
        <div className="card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="section-title">Contact & Footer</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Links shown on the platform</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Website URL
              </label>
              <input
                name="website_url"
                type="url"
                defaultValue={settings.website_url ?? ""}
                className="input"
                placeholder="https://youracademy.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Support Email
              </label>
              <input
                name="support_email"
                type="email"
                defaultValue={settings.support_email ?? ""}
                className="input"
                placeholder="support@youracademy.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Footer Text
              </label>
              <textarea
                name="footer_text"
                rows={3}
                defaultValue={settings.footer_text ?? ""}
                className="input resize-none"
                placeholder="Custom footer text shown on the landing page"
              />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
