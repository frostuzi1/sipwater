"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { OrderHistoryDetailPanel } from "@/components/order-history-detail";
import { Navbar } from "@/components/navbar";
import {
  mapRawOrderToClientRow,
  type OrderItem,
  type OrderRow,
} from "@/lib/map-order-row";
import { getClientCategoryNavLinks } from "@/lib/landing-categories";
import { setFlashMessage } from "@/lib/flash-message";
import { getSupabaseClient } from "@/lib/supabase";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = String(params?.id ?? "");

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
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
      if (!cancelled) {
        setDisplayName(fullName ?? user.email ?? null);
      }

      if (!orderId) {
        if (!cancelled) {
          setError("Invalid order.");
          setLoading(false);
        }
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("id, created_at, total_price, status, items")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError || !data) {
        if (!cancelled) {
          setError("Order not found or you do not have access.");
          setLoading(false);
        }
        return;
      }

      const row = data as {
        id: string;
        created_at: string;
        total_price: number | string | null;
        status: string | null;
        items?: OrderItem[] | null;
      };

      const productIds = Array.from(
        new Set(
          (Array.isArray(row.items) ? row.items : [])
            .map((it) => String(it.product_id ?? "").trim())
            .filter((id) => id.length > 0)
        )
      );

      const productPhotoById = new Map<string, string | null>();
      if (productIds.length > 0) {
        const { data: productRows } = await supabase
          .from("products")
          .select("id, photo_url")
          .in("id", productIds);

        for (const pr of (productRows ?? []) as Array<{
          id: string;
          photo_url: string | null;
        }>) {
          productPhotoById.set(String(pr.id), pr.photo_url ?? null);
        }
      }

      if (!cancelled) {
        setOrder(mapRawOrderToClientRow(row, productPhotoById));
        setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, orderId]);

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
        categoryLinks={getClientCategoryNavLinks()}
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

        <div className="mb-6">
          <Link
            href="/orders"
            className="text-sm font-semibold text-sky-700 hover:underline"
          >
            ← Back to order history
          </Link>
        </div>

        <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-lg shadow-sky-500/10 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Order details
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Line items, totals, and delivery status for this order.
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-slate-600">Loading…</p>
          ) : error ? (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </p>
          ) : order ? (
            <div className="mt-6">
              <OrderHistoryDetailPanel order={order} />
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
