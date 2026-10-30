"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LiveRefresh({ updatedAt }: { updatedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && !pending) startTransition(() => router.refresh());
    };
    const timer = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pending, router]);
  return (
    <div className="my-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
      <p>Updates every 5 seconds · Last updated {new Date(updatedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
      <button type="button" className="font-medium text-indigo-600 disabled:opacity-50" disabled={pending}
        onClick={() => startTransition(() => router.refresh())}>
        {pending ? "Refreshing…" : "Refresh now"}
      </button>
    </div>
  );
}
