import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStudent();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/student" className="font-semibold">
            ExamHub
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-gray-500 sm:inline">
              {profile.full_name || profile.email}
            </span>
            <form action={logout}>
              <button className="rounded-md border px-3 py-1.5 hover:bg-gray-100">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
