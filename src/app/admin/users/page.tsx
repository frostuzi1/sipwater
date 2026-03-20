"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isAdminEmail } from "@/lib/admin";
import { setFlashMessage } from "@/lib/flash-message";
import { Navbar } from "@/components/navbar";
import { getSupabaseClient } from "@/lib/supabase";

type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  contact_number: string | null;
  address: string | null;
};

type ProfileRowWithPhone = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type ProfileRowWithContactNumber = {
  id: string;
  full_name: string | null;
  email: string | null;
  contact_number: string | null;
  address: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [usersActionMessage, setUsersActionMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    address: "",
  });

  const fetchUsers = async (excludeUserId?: string) => {
    const excludedId = excludeUserId ?? adminUserId ?? undefined;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const primary = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, address")
      .order("email", { ascending: true });

    if (!primary.error) {
      const rows = (primary.data ?? []) as ProfileRowWithPhone[];
      const mapped = rows.map((row) => ({
        id: row.id,
        full_name: row.full_name ?? null,
        email: row.email ?? null,
        contact_number: row.phone ?? null,
        address: row.address ?? null,
      }));
      setUsers(mapped.filter((row) => row.id !== excludedId));
      setUsersError(null);
      setUsersLoading(false);
      return;
    }

    const fallback = await supabase
      .from("profiles")
      .select("id, full_name, email, contact_number, address")
      .order("email", { ascending: true });

    if (!fallback.error) {
      const rows = (fallback.data ?? []) as ProfileRowWithContactNumber[];
      const mapped = rows.map((row) => ({
        id: row.id,
        full_name: row.full_name ?? null,
        email: row.email ?? null,
        contact_number: row.contact_number ?? null,
        address: row.address ?? null,
      }));
      setUsers(mapped.filter((row) => row.id !== excludedId));
      setUsersError(null);
      setUsersLoading(false);
      return;
    }

    setUsersError(
      `Unable to load users list: ${fallback.error.message || primary.error.message}`
    );
    setUsersLoading(false);
  };

  const beginEditUser = (user: AdminUserRow) => {
    setUsersActionMessage(null);
    setEditingUserId(user.id);
    setEditForm({
      full_name: user.full_name ?? "",
      email: user.email ?? "",
      contact_number: user.contact_number ?? "",
      address: user.address ?? "",
    });
  };

  const handleSaveEditUser = async () => {
    if (!editingUserId) return;
    setUsersActionMessage(null);
    setActionLoadingId(editingUserId);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setUsersActionMessage("Supabase is not configured.");
      setActionLoadingId(null);
      return;
    }

    const payload = {
      full_name: editForm.full_name || null,
      email: editForm.email || null,
      address: editForm.address || null,
      phone: editForm.contact_number || null,
    };

    const primary = await supabase
      .from("profiles")
      .update(payload as never)
      .eq("id", editingUserId);

    if (primary.error) {
      const fallback = await supabase
        .from("profiles")
        .update(
          {
            full_name: editForm.full_name || null,
            email: editForm.email || null,
            address: editForm.address || null,
            contact_number: editForm.contact_number || null,
          } as never
        )
        .eq("id", editingUserId);

      if (fallback.error) {
        setUsersActionMessage(fallback.error.message || primary.error.message);
        setActionLoadingId(null);
        return;
      }
    }

    setUsersActionMessage("User updated successfully.");
    setActionLoadingId(null);
    setEditingUserId(null);
    await fetchUsers();
  };

  const handleDeleteUser = async (user: AdminUserRow) => {
    const confirmed = window.confirm(
      `Delete ${user.full_name || user.email || "this user"} from profiles?`
    );
    if (!confirmed) return;

    setUsersActionMessage(null);
    setActionLoadingId(user.id);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setUsersActionMessage("Supabase is not configured.");
      setActionLoadingId(null);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const response = await fetch(
      `/api/admin/users/${encodeURIComponent(user.id)}`,
      {
        method: "DELETE",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      }
    );

    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setUsersActionMessage(body?.error || "Failed to delete user.");
      setActionLoadingId(null);
      return;
    }

    setUsersActionMessage("User deleted successfully.");
    setActionLoadingId(null);
    if (editingUserId === user.id) {
      setEditingUserId(null);
    }
    await fetchUsers();
  };

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
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

      if (!isAdminEmail(user.email)) {
        router.replace("/test-landing");
        return;
      }

      if (!isMounted) return;
      setAdminUserId(user.id);
      setDisplayName(
        ((user.user_metadata?.full_name as string | undefined) ?? "Admin").trim() ||
          "Admin"
      );
      setLoading(false);
      await fetchUsers(user.id);

      const channel = supabase
        .channel("admin-users-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => {
            void fetchUsers(user.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;
    void loadPage().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
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
        homeHref="/admin"
        viewUsersHref="/admin/users"
        manageOrdersHref="/admin/orders"
        userName={loading ? "..." : displayName}
        onLogoutClick={handleLogout}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Users List
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View registered users with email, contact number, and address.
          </p>

          {usersError ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {usersError}
            </p>
          ) : null}
          {usersActionMessage ? (
            <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              {usersActionMessage}
            </p>
          ) : null}

          {usersLoading ? (
            <p className="mt-4 text-sm text-slate-600">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
              No users found.
            </p>
          ) : (
            <div className="mt-4 max-h-[540px] overflow-auto rounded-2xl border border-sky-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-sky-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Full Name</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Contact Number</th>
                    <th className="px-3 py-2 font-semibold">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-sky-100">
                      <td className="px-3 py-2 text-slate-800">
                        {user.full_name || "N/A"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {user.email || "N/A"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {user.contact_number || "N/A"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {user.address || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
