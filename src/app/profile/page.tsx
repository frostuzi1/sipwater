"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { setFlashMessage } from "@/lib/flash-message";
import { getSupabaseClient } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [contactNumber, setContactNumber] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftContactNumber, setDraftContactNumber] = useState("");
  const [draftAddress, setDraftAddress] = useState("");

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

      setUserId(user.id);
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ?? null;
      const metadataAddress =
        (user.user_metadata?.address as string | undefined) ?? "";
      const metadataContact =
        (user.user_metadata?.contact_number as string | undefined) ??
        (user.user_metadata?.phone as string | undefined) ??
        (user.user_metadata?.contact as string | undefined) ??
        "";

      setDisplayName(fullName ?? user.email ?? null);
      setEmail(user.email ?? null);

      const profileWithPhone = await supabase
        .from("profiles")
        .select("full_name, address, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileWithPhone.error && profileWithPhone.data) {
        const row = profileWithPhone.data as {
          full_name?: string | null;
          address?: string | null;
          phone?: string | null;
        };
        setDisplayName(row.full_name ?? fullName ?? user.email ?? null);
        setAddress(row.address ?? metadataAddress);
        setContactNumber(row.phone ?? metadataContact);
        return;
      }

      const profileWithContactNumber = await supabase
        .from("profiles")
        .select("full_name, address, contact_number")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileWithContactNumber.error && profileWithContactNumber.data) {
        const row = profileWithContactNumber.data as {
          full_name?: string | null;
          address?: string | null;
          contact_number?: string | null;
        };
        setDisplayName(row.full_name ?? fullName ?? user.email ?? null);
        setAddress(row.address ?? metadataAddress);
        setContactNumber(row.contact_number ?? metadataContact);
        return;
      }

      setAddress(metadataAddress);
      setContactNumber(metadataContact);
    };

    void loadUser();
  }, [router]);

  useEffect(() => {
    if (!isEditing) return;
    setDraftDisplayName(displayName ?? "");
    setDraftContactNumber(contactNumber ?? "");
    setDraftAddress(address ?? "");
  }, [isEditing, displayName, contactNumber, address]);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase || !userId) {
      setError("Unable to save profile right now.");
      return;
    }

    const normalizedContact = draftContactNumber.replace(/\D/g, "").slice(0, 11);
    if (normalizedContact && !/^09\d{9}$/.test(normalizedContact)) {
      setError("Contact number must follow 09XXXXXXXXX format.");
      return;
    }

    setSaving(true);

    const profilePayload = {
      id: userId,
      full_name: draftDisplayName.trim() || null,
      address: draftAddress.trim() || null,
      phone: normalizedContact || null,
      contact_number: normalizedContact || null,
      email: email ?? null,
    };

    const profileResult = await supabase
      .from("profiles")
      .upsert(profilePayload as never, { onConflict: "id" });

    if (profileResult.error) {
      setSaving(false);
      setError(`Unable to update profile: ${profileResult.error.message}`);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: draftDisplayName.trim() || "",
        address: draftAddress.trim(),
        phone: normalizedContact,
        contact_number: normalizedContact,
      },
    });

    if (authError) {
      setSaving(false);
      setError(`Profile saved, but auth metadata update failed: ${authError.message}`);
      return;
    }

    setDisplayName(draftDisplayName.trim() || null);
    setAddress(draftAddress.trim());
    setContactNumber(normalizedContact);
    setMessage("Profile updated successfully.");
    setIsEditing(false);
    setSaving(false);
  };

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
        homeHref="/category/purified-water"
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
            Update your contact details for delivery and order coordination.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSaveProfile}>
            <label className="block space-y-2">
              <span className="text-xs font-medium text-slate-700">Full name</span>
              <input
                type="text"
                value={isEditing ? draftDisplayName : displayName ?? ""}
                onChange={(event) => setDraftDisplayName(event.target.value)}
                className={`h-11 w-full rounded-2xl border px-3 text-sm outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400 ${
                  isEditing
                    ? "border-sky-200 bg-sky-50/50 text-slate-800"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
                readOnly={!isEditing}
                disabled={!isEditing}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email ?? ""}
                className="h-11 w-full rounded-2xl border border-sky-200 bg-slate-50 px-3 text-sm text-slate-500"
                readOnly
                disabled
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-medium text-slate-700">Contact number</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="09[0-9]{9}"
                maxLength={11}
                placeholder="09XXXXXXXXX"
                value={isEditing ? draftContactNumber : contactNumber}
                onChange={(event) =>
                  setDraftContactNumber(event.target.value.replace(/\D/g, "").slice(0, 11))
                }
                className={`h-11 w-full rounded-2xl border px-3 text-sm outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400 ${
                  isEditing
                    ? "border-sky-200 bg-sky-50/50 text-slate-800"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
                readOnly={!isEditing}
                disabled={!isEditing}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-medium text-slate-700">Address</span>
              <input
                type="text"
                placeholder="Delivery address"
                value={isEditing ? draftAddress : address}
                onChange={(event) => setDraftAddress(event.target.value)}
                className={`h-11 w-full rounded-2xl border px-3 text-sm outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400 ${
                  isEditing
                    ? "border-sky-200 bg-sky-50/50 text-slate-800"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
                readOnly={!isEditing}
                disabled={!isEditing}
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {message}
              </p>
            ) : null}

            {isEditing ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save profile"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                    setMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-sky-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setIsEditing(true);
                }}
                className="inline-flex h-11 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600"
              >
                Edit profile
              </button>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}

