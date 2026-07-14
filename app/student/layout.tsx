import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getAcademySettings } from "@/lib/settings";
import { logout } from "../(auth)/actions";
import ThemeToggle from "@/components/ThemeToggle";
import { LogOut, User } from "lucide-react";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStudent();
  const settings = await getAcademySettings();

  return (
    <div className="min-h-screen">
      <header
        data-student-header
        className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl print:hidden dark:border-slate-700/80 dark:bg-slate-900/80"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/student" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40">
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
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/student/profile"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:hidden dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
              title="Profile"
            >
              <User className="h-4 w-4" />
            </Link>
            <div className="hidden sm:block text-right">
              <Link href="/student/profile" className="text-sm font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">
                {profile.full_name || profile.email}
              </Link>
              <p className="text-xs text-slate-400 dark:text-slate-500">Student</p>
            </div>
            <form action={logout}>
              <button
                aria-label="Logout"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main data-student-main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
