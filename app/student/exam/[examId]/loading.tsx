export default function ExamIntroLoading() {
  return (
    <div className="mx-auto max-w-lg animate-pulse">
      <div className="mb-4 h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600/30 to-violet-600/30 px-6 py-5 dark:from-indigo-900/30 dark:to-violet-900/30">
          <div className="h-6 w-48 rounded bg-white/30" />
          <div className="mt-2 h-4 w-32 rounded bg-white/20" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-700/50">
                <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-600" />
                <div className="mt-2 h-6 w-10 rounded bg-slate-200 dark:bg-slate-600" />
              </div>
            ))}
          </div>
          <div className="mt-5 h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}
