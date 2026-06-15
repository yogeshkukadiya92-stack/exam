import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    { label: "Courses", count: courses.count ?? 0, href: "/admin/courses" },
    { label: "Exams", count: exams.count ?? 0, href: "/admin/exams" },
    { label: "Students", count: students.count ?? 0, href: "/admin/students" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border bg-white p-5 transition hover:shadow-sm"
          >
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold">{s.count}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
