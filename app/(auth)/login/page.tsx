import { login } from "../actions";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Login</h1>
        <p className="mb-5 text-sm text-gray-500">Exam Platform ma login karo</p>

        {message && (
          <p className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={login} className="space-y-3">
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
            placeholder="Password"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Login
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Account nathi?{" "}
          <Link href="/signup" className="font-medium text-gray-900 underline">
            Signup
          </Link>
        </p>
      </div>
    </div>
  );
}
