"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="btn-primary mt-5 inline-flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
