"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { OrderHistoryDetailPanel } from "@/components/order-history-detail";
import { Navbar } from "@/components/navbar";
import {
  mapRawOrderToClientRow,
  type OrderItem,
  type OrderRow,
} from "@/lib/map-order-row";
import {
  formatOrderCurrency,
  formatOrderStatus,
} from "@/lib/order-display";
import { getClientCategoryNavLinks } from "@/lib/landing-categories";
import { setFlashMessage } from "@/lib/flash-message";
import { getSupabaseClient } from "@/lib/supabase";

export default function OrdersPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let channel: any = null;
    let pollIntervalId: number | null = null;

    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace("/");
      return;
    }

    const init = async () => {
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

      const userId = user.id;

      const loadOrders = async (options?: { showLoading?: boolean }) => {
        const showLoading = options?.showLoading ?? false;
        if (showLoading) setLoading(true);

        const { data } = await supabase
          .from("orders")
          .select("id, created_at, total_price, status, items")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        const rows = (data ?? []) as Array<OrderRow & { items?: OrderItem[] | null }>;

        const productIds = Array.from(
          new Set(
            rows.flatMap((order) =>
              (Array.isArray(order.items) ? order.items : [])
                .map((it) => String(it.product_id ?? "").trim())
                .filter((id) => id.length > 0)
            )
          )
        );

        const productPhotoById = new Map<string, string | null>();
        if (productIds.length > 0) {
          const { data: productRows } = await supabase
            .from("products")
            .select("id, photo_url")
            .in("id", productIds);

          for (const row of (productRows ?? []) as Array<{
            id: string;
            photo_url: string | null;
          }>) {
            productPhotoById.set(String(row.id), row.photo_url ?? null);
          }
        }

        const mapped: OrderRow[] = rows.map((order: any) =>
          mapRawOrderToClientRow(
            {
              id: String(order.id),
              created_at: String(order.created_at),
              total_price: order.total_price,
              status: order.status,
              items: Array.isArray(order.items)
                ? (order.items as OrderItem[])
                : null,
            },
            productPhotoById
          )
        );

        if (!isMounted) return;
        setOrders(mapped);
        setLoading(false);
      };

      await loadOrders({ showLoading: true });

      // Fallback polling: keeps the UI in sync even if realtime events are delayed/missed.
      pollIntervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void loadOrders();
      }, 8000);

      channel = supabase
        .channel("orders-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => {
            void loadOrders();
          }
        )
        .subscribe();
    };

    void init();

    return () => {
      isMounted = false;
      if (pollIntervalId) window.clearInterval(pollIntervalId);
      if (channel) supabase.removeChannel(channel);
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
        <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-lg shadow-sky-500/10 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Order History
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your latest orders from Sip Water.
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-slate-600">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="mt-6 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
              No orders yet.
            </p>
          ) : (
            <>
            <div className="mt-6 space-y-3 sm:hidden">
              {orders.map((order) => {
                const expanded = expandedOrderId === order.id;
                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                          Date
                        </p>
                        <p className="text-sm text-slate-600">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                            Total
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            ₱{formatOrderCurrency(order.total_price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                            Status
                          </p>
                          <p className="text-sm font-semibold text-sky-700">
                            {formatOrderStatus(order.status)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrderId(expanded ? null : order.id)
                          }
                          className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50"
                          aria-expanded={expanded}
                        >
                          {expanded ? "Hide details" : "View details"}
                        </button>
                        <Link
                          href={`/orders/${order.id}`}
                          className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-center text-xs font-semibold text-sky-800 hover:bg-sky-100"
                        >
                          Open full page
                        </Link>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="mt-4">
                        <OrderHistoryDetailPanel order={order} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-sky-100 sm:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-sky-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const expanded = expandedOrderId === order.id;
                    return (
                      <Fragment key={order.id}>
                        <tr className="border-t border-sky-100">
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(order.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            ₱{formatOrderCurrency(order.total_price)}
                          </td>
                          <td className="px-4 py-3 text-sky-700">
                            {formatOrderStatus(order.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedOrderId(expanded ? null : order.id)
                                }
                                className="rounded-lg border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-sky-50"
                                aria-expanded={expanded}
                              >
                                {expanded ? "Hide details" : "View details"}
                              </button>
                              <Link
                                href={`/orders/${order.id}`}
                                className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                              >
                                Full page
                              </Link>
                            </div>
                          </td>
                        </tr>

                        {expanded ? (
                          <tr className="bg-sky-50/30">
                            <td colSpan={4} className="px-4 py-3">
                              <OrderHistoryDetailPanel order={order} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

