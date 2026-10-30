/** Runs in each persistent Next.js Node server, even with every browser closed. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { autoSubmitExpiredAttempts } = await import("./lib/auto-submit-attempts");
  const state = globalThis as typeof globalThis & { examExpiryWorker?: ReturnType<typeof setInterval> };
  if (state.examExpiryWorker) return;
  let busy = false;
  const sweep = async () => {
    if (busy) return;
    busy = true;
    try {
      await autoSubmitExpiredAttempts();
    } catch (error) {
      console.error("Exam expiry worker failed", error);
    } finally {
      busy = false;
    }
  };
  state.examExpiryWorker = setInterval(() => void sweep(), 15000);
  state.examExpiryWorker.unref();
  void sweep();
}
