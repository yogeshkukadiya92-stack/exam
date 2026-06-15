import Link from "next/link";
import { getProfile, isAdmin } from "@/lib/auth";
import { getAcademySettings } from "@/lib/settings";
import {
  ShieldCheck,
  Monitor,
  Zap,
  Award,
  UserPlus,
  FileText,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default async function LandingPage() {
  const profile = await getProfile();
  const settings = await getAcademySettings();

  const dashboardHref = profile
    ? isAdmin(profile.role)
      ? "/admin"
      : "/student"
    : null;

  const features = [
    {
      icon: ShieldCheck,
      title: "Secure Exams",
      desc: "Role-based access, RLS-protected data, and encrypted connections keep every exam safe.",
      color: "from-indigo-500 to-indigo-600",
      shadow: "shadow-indigo-200",
    },
    {
      icon: Monitor,
      title: "Anti-Cheat Proctoring",
      desc: "Tab-switch detection and copy-paste blocking ensure exam integrity.",
      color: "from-violet-500 to-violet-600",
      shadow: "shadow-violet-200",
    },
    {
      icon: Zap,
      title: "Instant Results",
      desc: "Auto-graded MCQs with detailed analytics, score distribution, and leaderboards.",
      color: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-200",
    },
    {
      icon: Award,
      title: "Certificates",
      desc: "Automatic certificate generation for students who pass their exams.",
      color: "from-amber-500 to-amber-600",
      shadow: "shadow-amber-200",
    },
  ];

  const steps = [
    { num: "1", title: "Sign Up", desc: "Create your account in seconds" },
    { num: "2", title: "Take Exam", desc: "Attempt assigned exams with a timed, proctored interface" },
    { num: "3", title: "Get Results", desc: "View scores, analytics, and download certificates" },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center gap-3">
            {dashboardHref ? (
              <Link href={dashboardHref} className="btn-primary flex items-center gap-1.5 text-sm">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                >
                  Sign In
                </Link>
                <Link href="/signup" className="btn-primary text-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-4 py-20 text-center sm:py-28">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {settings.tagline || "Modern Online Exam Platform"}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-indigo-100">
            Create, manage, and deliver secure online exams for your academy.
            Built for educators who demand reliability and simplicity.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            {dashboardHref ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-lg shadow-indigo-900/20 transition-all hover:shadow-xl active:scale-[0.98]"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-lg shadow-indigo-900/20 transition-all hover:shadow-xl active:scale-[0.98]"
                >
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need to run <span className="gradient-text">online exams</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-500">
            A complete platform designed for online academies and educational institutions.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card-hover p-6 text-center">
              <div
                className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} shadow-sm ${f.shadow}`}
              >
                <f.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white shadow-sm shadow-indigo-200">
                  {s.num}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Ready to get started?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-slate-500">
          Join thousands of educators using {settings.name} to create and deliver secure online examinations.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          {dashboardHref ? (
            <Link href={dashboardHref} className="btn-primary flex items-center gap-1.5">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/signup" className="btn-primary flex items-center gap-1.5">
                Create Account <UserPlus className="h-4 w-4" />
              </Link>
              <Link href="/login" className="btn-secondary">
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white px-4 py-6 text-center sm:px-6">
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} {settings.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
