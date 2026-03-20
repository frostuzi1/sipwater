"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { setFlashMessage } from "@/lib/flash-message";
import { getSupabaseClient } from "@/lib/supabase";

type OrderItem = {
  product_id?: string | null;
  unit_type?: string | null;
  name?: string | null;
  size?: string | null;
  pack?: string | null;
  unit_price?: number | string | null;
  quantity?: number | null;
};

type OrderRow = {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  bottle_quantity: number;
  case_quantity: number;
  bottle_items: Array<{
    name: string;
    size: string;
    qty: number;
    unit_price: number;
    photo_url: string | null;
  }>;
  case_items: Array<{
    name: string;
    size: string;
    qty: number;
    unit_price: number;
    photo_url: string | null;
  }>;
};

export default function OrdersPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const formatStatus = (status: string | null | undefined) => {
    const normalized = (status ?? "").trim();
    if (!normalized) return "";
    const lower = normalized.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const formatItemSize = (size: string) =>
    size.replace(/\bml\b/gi, "mL").replace(/\bl\b/g, "L");

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

        const mapped: OrderRow[] = rows.map((order: any) => {
          const items = Array.isArray(order.items)
            ? (order.items as OrderItem[])
            : [];

          let bottle_quantity = 0;
          let case_quantity = 0;

          const byProduct: Record<
            string,
            {
              unit_type: "bottle" | "case";
              name: string;
              size: string;
              qty: number;
              unit_price: number;
              photo_url: string | null;
            }
          > = {};

          for (const it of items) {
            const unitTypeRaw = (it.unit_type ?? "").toString().toLowerCase();
            const qty = Number(it.quantity ?? 0);
            const name = String(it.name ?? "").trim();
            const size = String(it.size ?? "").trim();
            const productId = String(it.product_id ?? "").trim();
            const unitPrice = Number(it.unit_price ?? 0);
            if (!name || !unitTypeRaw || qty <= 0) continue;

            const mappedType =
              unitTypeRaw === "case"
                ? "case"
                : unitTypeRaw === "bottle"
                  ? "bottle"
                  : null;
            if (!mappedType) continue;

            if (mappedType === "bottle") bottle_quantity += qty;
            if (mappedType === "case") case_quantity += qty;

            const key = `${name}__${mappedType}__${size}`;
            if (!byProduct[key])
              byProduct[key] = {
                unit_type: mappedType,
                name,
                size,
                qty: 0,
                unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
                photo_url: productPhotoById.get(productId) ?? null,
              };
            byProduct[key].qty += qty;
          }

          const bottle_items = Object.values(byProduct)
            .filter((p) => p.unit_type === "bottle")
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => ({
              name: p.name,
              size: p.size,
              qty: p.qty,
              unit_price: p.unit_price,
              photo_url: p.photo_url,
            }));

          const case_items = Object.values(byProduct)
            .filter((p) => p.unit_type === "case")
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => ({
              name: p.name,
              size: p.size,
              qty: p.qty,
              unit_price: p.unit_price,
              photo_url: p.photo_url,
            }));

          return {
            id: String(order.id),
            created_at: String(order.created_at),
            total_price: Number(order.total_price ?? 0),
            status: String(order.status ?? ""),
            bottle_quantity,
            case_quantity,
            bottle_items,
            case_items,
          };
        });

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
        homeHref="/home"
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
                            ₱{Number(order.total_price).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                            Status
                          </p>
                          <p className="text-sm font-semibold text-sky-700">
                            {formatStatus(order.status)}
                          </p>
                        </div>
                      </div>
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
                    </div>

                    {expanded ? (
                      <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/30 p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                              Extra details
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {new Date(order.created_at).toLocaleString()}
                            </p>
                            <p className="text-sm text-slate-600">Order ID: {order.id}</p>
                            <p className="text-sm text-slate-600">
                              Total: ₱{Number(order.total_price).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                              Bottles: {order.bottle_quantity.toLocaleString()}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Cases: {order.case_quantity.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                              Bottles
                            </p>
                            {order.bottle_items.length === 0 ? (
                              <p className="text-sm text-slate-600">None</p>
                            ) : (
                              <div className="space-y-2">
                                {order.bottle_items.map((it) => (
                                  <div
                                    key={`m-bottle-${it.name}`}
                                    className="flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-2 py-2 text-xs font-medium text-slate-700"
                                  >
                                    {it.photo_url ? (
                                      <img
                                        src={it.photo_url}
                                        alt={`${it.name} product`}
                                        className="h-14 w-14 rounded-lg border border-sky-100 bg-white object-contain"
                                      />
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-slate-800">
                                        {it.name} ({formatItemSize(it.size)})
                                      </p>
                                      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-700">
                                        <span>₱{Number(it.unit_price ?? 0).toFixed(2)}/pc</span>
                                        <span>Qty: {it.qty}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Cases
                            </p>
                            {order.case_items.length === 0 ? (
                              <p className="text-sm text-slate-600">None</p>
                            ) : (
                              <div className="space-y-2">
                                {order.case_items.map((it) => (
                                  <div
                                    key={`m-case-${it.name}`}
                                    className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-2 py-2 text-xs font-medium text-slate-700"
                                  >
                                    {it.photo_url ? (
                                      <img
                                        src={it.photo_url}
                                        alt={`${it.name} product`}
                                        className="h-14 w-14 rounded-lg border border-emerald-100 bg-white object-contain"
                                      />
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-slate-800">
                                        {it.name} ({formatItemSize(it.size)})
                                      </p>
                                      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-700">
                                        <span>₱{Number(it.unit_price ?? 0).toFixed(2)}/case</span>
                                        <span>Qty: {it.qty}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
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
                            ₱{Number(order.total_price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sky-700">
                            {formatStatus(order.status)}
                          </td>
                          <td className="px-4 py-3">
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
                          </td>
                        </tr>

                        {expanded ? (
                          <tr className="bg-sky-50/30">
                            <td colSpan={4} className="px-4 py-3">
                              <div className="rounded-2xl border border-sky-100 bg-white p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                  <div className="space-y-1">
                                    <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                                      Extra details
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {new Date(order.created_at).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      Order ID: {order.id}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      Total: ₱{Number(order.total_price).toFixed(2)}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                                      Bottles: {order.bottle_quantity.toLocaleString()}
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                      Cases: {order.case_quantity.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                                      Bottles
                                    </p>
                                    {order.bottle_items.length === 0 ? (
                                      <p className="text-sm text-slate-600">None</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {order.bottle_items.map((it) => (
                                          <div
                                            key={`bottle-${it.name}`}
                                            className="flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-2 py-2 text-xs font-medium text-slate-700"
                                          >
                                            {it.photo_url ? (
                                              <img
                                                src={it.photo_url}
                                                alt={`${it.name} product`}
                                                className="h-14 w-14 rounded-lg border border-sky-100 bg-white object-contain"
                                              />
                                            ) : null}
                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-semibold text-slate-800">
                                                {it.name} ({formatItemSize(it.size)})
                                              </p>
                                              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-700">
                                                <span>₱{Number(it.unit_price ?? 0).toFixed(2)}/pc</span>
                                                <span>Qty: {it.qty}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
                                      Cases
                                    </p>
                                    {order.case_items.length === 0 ? (
                                      <p className="text-sm text-slate-600">None</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {order.case_items.map((it) => (
                                          <div
                                            key={`case-${it.name}`}
                                            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-2 py-2 text-xs font-medium text-slate-700"
                                          >
                                            {it.photo_url ? (
                                              <img
                                                src={it.photo_url}
                                                alt={`${it.name} product`}
                                                className="h-14 w-14 rounded-lg border border-emerald-100 bg-white object-contain"
                                              />
                                            ) : null}
                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-semibold text-slate-800">
                                                {it.name} ({formatItemSize(it.size)})
                                              </p>
                                              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-700">
                                                <span>₱{Number(it.unit_price ?? 0).toFixed(2)}/case</span>
                                                <span>Qty: {it.qty}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
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

