import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-zinc-950 dark:from-black dark:to-black dark:text-zinc-50">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Demo page for now—hook this up to your auth later.
          </p>

          <form className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                placeholder="you@gmail.com"
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-sky-500/30 focus:ring-4 dark:border-white/10 dark:bg-black/30"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Password</span>
              <input
                type="password"
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-sky-500/30 focus:ring-4 dark:border-white/10 dark:bg-black/30"
              />
            </label>

            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Continue
            </button>
          </form>

          <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">
            New to Sip Water?{" "}
            <Link href="/signup" className="font-semibold text-sky-700 dark:text-sky-300">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

