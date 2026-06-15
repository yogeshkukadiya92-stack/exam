import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, FileText, Users, ArrowUpRight } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [courses, exams, students] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("exams").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student"),
  ]);

  const stats = [
    {
      label: "Courses",
      count: courses.count ?? 0,
      href: "/admin/courses",
      icon: BookOpen,
      color: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-200",
    },
    {
      label: "Exams",
      count: exams.count ?? 0,
      href: "/admin/exams",
      icon: FileText,
      color: "from-violet-500 to-violet-600",
      shadow: "shadow-violet-200",
    },
    {
      label: "Students",
      count: students.count ?? 0,
      href: "/admin/students",
      icon: Users,
      color: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-200",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of your exam platform
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group card-hover p-6">
            <div className="flex items-start justify-between">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-sm ${s.shadow}`}
              >
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">{s.count}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              {s.label}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
