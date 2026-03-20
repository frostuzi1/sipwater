"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { setFlashMessage } from "@/lib/flash-message";
import { getSupabaseClient } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        router.replace("/");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        router.replace("/");
        return;
      }

      const fullName =
        (user.user_metadata?.full_name as string | undefined) ?? null;
      setDisplayName(fullName ?? user.email ?? null);
      setEmail(user.email ?? null);
    };

    void loadUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace("/");
      return;
    }
    await supabase.auth.signOut();
    setFlashMessage("Logged out successfully.");
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50/50 text-slate-800">
      <Navbar
        hideAuthButtons
        homeHref="/test-landing"
        profileHref="/profile"
        orderHistoryHref="/orders"
        userName={displayName ?? "User"}
        onLogoutClick={handleLogout}
      />

      <main className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />
        </div>
        <section className="mx-auto max-w-4xl rounded-3xl border border-sky-100 bg-white p-6 shadow-lg shadow-sky-500/10 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Basic account information from your authenticated session.
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
              <dt className="text-xs uppercase tracking-wide text-sky-700">Full name</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">
                {displayName ?? "Not set"}
              </dd>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
              <dt className="text-xs uppercase tracking-wide text-sky-700">Email</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">
                {email ?? "Not available"}
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}

