import Link from "next/link";
import { requireAdmin, isSuperAdmin } from "@/lib/auth";
import { getAcademySettings } from "@/lib/settings";
import { logout } from "../(auth)/actions";
import ThemeToggle from "@/components/ThemeToggle";
import MobileNav from "@/components/MobileNav";
import { LayoutDashboard, BookOpen, FileText, Users, LogOut, Megaphone, Settings, Library, Mail, Award } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();
  const settings = await getAcademySettings();
  const superAdmin = isSuperAdmin(profile.role);

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/exams", label: "Exams", icon: FileText },
    { href: "/admin/question-bank", label: "Bank", icon: Library },
    { href: "/admin/certificates", label: "Certificates", icon: Award },
    { href: "/admin/notifications", label: "Notifications", icon: Mail },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    ...(superAdmin ? [{ href: "/admin/students", label: "Students", icon: Users }] : []),
    ...(superAdmin ? [{ href: "/admin/settings", label: "Settings", icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/admin" className="flex items-center gap-2">
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
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <MobileNav items={navItems.map((i) => ({ href: i.href, label: i.label }))} />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Administrator</p>
            </div>
            <form action={logout}>
              <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
