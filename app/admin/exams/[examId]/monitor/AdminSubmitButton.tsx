"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSubmitAttempt } from "./actions";
import { withTimeout } from "@/lib/async/with-timeout";

export default function AdminSubmitButton({ examId, attemptId, studentName }: {
  examId: string; attemptId: string; studentName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const submit = () => {
    if (!window.confirm(`Submit ${studentName}'s exam now? Only answers saved to the server will be graded. Unsaved answers on the student's device are not included. This ends the attempt.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await withTimeout(adminSubmitAttempt(examId, attemptId), 60000);
        if (result.error) setError(result.error);
        router.refresh();
      } catch {
        setError("Submission could not be confirmed. Refresh the status before trying again.");
      }
    });
  };
  return <div>
    <button type="button" onClick={submit} disabled={pending}
      className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
      {pending ? "Submitting…" : "Submit exam"}
    </button>
    {error && <p role="alert" className="mt-2 max-w-xs text-sm text-red-600">{error}</p>}
  </div>;
}
