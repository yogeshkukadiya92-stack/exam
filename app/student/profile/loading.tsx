export default function ProfileLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-48 rounded bg-slate-100 dark:bg-slate-700/50" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div>
                <div className="h-5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-1 h-3 w-32 rounded bg-slate-100 dark:bg-slate-700/50" />
              </div>
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j}>
                  <div className="mb-1.5 h-3 w-16 rounded bg-slate-100 dark:bg-slate-700/50" />
                  <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-slate-700/50" />
                </div>
              ))}
              <div className="h-10 w-28 rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
