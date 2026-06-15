import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getAcademySettings } from "@/lib/settings";
import { logout } from "../(auth)/actions";
import { LogOut } from "lucide-react";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStudent();
  const settings = await getAcademySettings();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/student" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-200">
              <span className="text-sm font-bold text-white">E</span>
            </div>
            <span className="text-lg font-bold tracking-tight">
              {settings.name === "ExamHub" ? (
                <>Exam<span className="gradient-text">Hub</span></>
              ) : (
                <span className="gradient-text">{settings.name}</span>
              )}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-700">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-slate-400">Student</p>
            </div>
            <form action={logout}>
              <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
