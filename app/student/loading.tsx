export default function StudentDashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-40 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-56 rounded bg-slate-100 dark:bg-slate-700/50" />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5">
            <div className="mb-3 h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-6 w-12 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-3 w-20 rounded bg-slate-100 dark:bg-slate-700/50" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-3 w-32 rounded bg-slate-100 dark:bg-slate-700/50" />
                <div className="mt-2 h-3 w-24 rounded bg-slate-100 dark:bg-slate-700/50" />
              </div>
              <div className="h-10 w-20 rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
