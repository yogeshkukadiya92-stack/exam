import { requireSuperAdmin } from "@/lib/auth";
import { getAcademySettings } from "@/lib/settings";
import { updateSettings } from "./actions";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  await requireSuperAdmin();
  const settings = await getAcademySettings();

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Academy Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Customize your academy branding and appearance
        </p>
      </div>

      <div className="card max-w-xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm shadow-indigo-200">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="section-title">Branding</h2>
            <p className="text-xs text-slate-400">
              These settings are used across the platform
            </p>
          </div>
        </div>

        <form action={updateSettings} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Logo URL
            </label>
            <input
              name="logo_url"
              type="url"
              defaultValue={settings.logo_url ?? ""}
              className="input"
              placeholder="https://example.com/logo.png"
            />
            <p className="mt-1 text-xs text-slate-400">
              Direct link to your logo image (PNG or SVG recommended)
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-200"
                style={{ backgroundColor: settings.primary_color }}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary">
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
