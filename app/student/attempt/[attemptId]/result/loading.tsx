export default function ResultLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="card overflow-hidden">
        <div className="px-6 py-8 text-center bg-slate-50 dark:bg-slate-700/30">
          <div className="mx-auto h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-600" />
          <div className="mx-auto mt-3 h-6 w-48 rounded bg-slate-200 dark:bg-slate-600" />
          <div className="mx-auto mt-3 h-10 w-32 rounded bg-slate-200 dark:bg-slate-600" />
          <div className="mx-auto mt-3 h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-600" />
          <div className="mt-4 flex justify-center gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-600" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 mb-4 h-5 w-36 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 text-center">
            <div className="mx-auto h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="mx-auto mt-2 h-7 w-14 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mx-auto mt-1 h-3 w-24 rounded bg-slate-100 dark:bg-slate-700/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
