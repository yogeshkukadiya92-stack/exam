import { requireStudent } from "@/lib/auth";
import { updateProfile, changePassword } from "./actions";
import { User, Lock } from "lucide-react";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const profile = await requireStudent();
  const { error, message } = await searchParams;

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account settings
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Profile Info */}
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="section-title">Profile</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Update your display name</p>
            </div>
          </div>

          <form action={updateProfile} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                name="full_name"
                type="text"
                defaultValue={profile.full_name ?? ""}
                placeholder="Your full name"
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mobile Number
              </label>
              <input
                name="phone"
                type="tel"
                defaultValue={profile.phone ?? ""}
                placeholder="+91 9876543210"
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={profile.email ?? ""}
                disabled
                className="input opacity-60 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Email cannot be changed
              </p>
            </div>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm shadow-amber-200 dark:shadow-amber-900/30">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="section-title">Password</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Change your password</p>
            </div>
          </div>

          <form action={changePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                New Password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm Password
              </label>
              <input
                name="confirm_password"
                type="password"
                required
                placeholder="Re-enter password"
                className="input"
              />
            </div>
            <button type="submit" className="btn-primary">
              Change Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
