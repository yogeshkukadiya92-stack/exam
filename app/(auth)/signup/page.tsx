import { signup } from "../actions";
import Link from "next/link";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Signup</h1>
        <p className="mb-5 text-sm text-gray-500">Navu student account banavo</p>

        {error && (
          <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={signup} className="space-y-3">
          <input
            name="full_name"
            type="text"
            required
            placeholder="Full name"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 chars)"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create account
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Pehlethi account che?{" "}
          <Link href="/login" className="font-medium text-gray-900 underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
