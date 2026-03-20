"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isAdminEmail } from "@/lib/admin";
import { setFlashMessage } from "@/lib/flash-message";
import { Navbar } from "@/components/navbar";
import { getSupabaseClient } from "@/lib/supabase";

type AdminOrderRow = {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  itemsRaw: Array<Record<string, unknown>>;
  customer_name: string | null;
  address: string | null;
  contact_number: string | null;
  bottle_quantity: number;
  case_quantity: number;
  bottle_items: Array<{ name: string; size: string; pack: string; qty: number }>;
  case_items: Array<{ name: string; size: string; pack: string; qty: number }>;
};

const STATUS_OPTIONS = [
  "Preparing your order",
  "Out for delivery",
  "Delivered",
  "Cancelled",
] as const;
const getAdminStatusValue = (status: string | null | undefined) => {
  const normalized = (status ?? "").trim().toLowerCase();
  if (normalized === "pending" || normalized === "preparing your order") {
    return "Preparing your order";
  }
  if (normalized === "on the way" || normalized === "out for delivery") {
    return "Out for delivery";
  }
  if (normalized === "delivered") {
    return "Delivered";
  }
  if (normalized === "cancelled") {
    return "Cancelled";
  }
  return "Preparing your order";
};
const isDeliveredStatus = (status: string | null | undefined) =>
  (status ?? "").toLowerCase() === "delivered";
const formatCurrency = (value: number | string | null | undefined) =>
  Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function AdminOrdersPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersMessage, setOrdersMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingQuantitiesOrderId, setEditingQuantitiesOrderId] = useState<
    string | null
  >(null);
  const [quantityDraft, setQuantityDraft] = useState<Record<string, number>>(
    {}
  );
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);

  const fetchOrders = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from("orders")
      .select("id, created_at, total_price, status, user_id, items")
      .order("created_at", { ascending: false });

    if (error) {
      setOrdersError(error.message);
      setOrdersLoading(false);
      return;
    }

    const orders = (data ?? []) as Array<
      AdminOrderRow & {
        user_id?: string | null;
        items?: Array<{
          unit_type?: string;
          name?: string;
          quantity?: number;
        }> | null;
      }
    >;

    const userIds = Array.from(
      new Set(orders.map((o) => o.user_id).filter(Boolean))
    ) as string[];

    let profilesById = new Map<
      string,
      { full_name: string | null; address: string | null; contact_number: string | null }
    >();
    let profilesFetchFailed = false;

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, address")
        .in("id", userIds);

      if (profilesError) {
        setOrdersError(`Unable to load customer profiles: ${profilesError.message}`);
        profilesFetchFailed = true;
      }

      if (!profilesFetchFailed) {
        profilesById = new Map(
          (profilesData ?? []).map((row: any) => [
            String(row.id),
            {
              full_name: (row.full_name as string | null) ?? null,
              address: (row.address as string | null) ?? null,
              contact_number: (row.phone as string | null) ?? null,
            },
          ])
        );
      }
    }

    setOrders(
      orders.map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        let bottle_quantity = 0;
        let case_quantity = 0;
        const byProduct: Record<
          string,
          { unit_type: string; name: string; size: string; pack: string; qty: number }
        > = {};

        for (const it of items) {
          const qty = Number(it.quantity ?? 0);
          const unitType =
            (it.unit_type as string | undefined | null) ?? undefined;
          const name = String(it.name ?? "").trim();
          const size = String((it as any).size ?? "").trim();
          const pack = String((it as any).pack ?? "").trim();

          if (unitType === "bottle") bottle_quantity += qty;
          else if (unitType === "case") case_quantity += qty;

          if (!name || !unitType) continue;
          const key = `${name}__${unitType}__${size}__${pack}`;
          if (!byProduct[key]) {
            byProduct[key] = { unit_type: unitType, name, size, pack, qty: 0 };
          }
          byProduct[key].qty += qty;
        }

        const profile = order.user_id
          ? profilesById.get(String(order.user_id)) ?? null
          : null;

        const bottle_items = Object.values(byProduct)
          .filter((p) => p.unit_type === "bottle")
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => ({ name: p.name, size: p.size, pack: p.pack, qty: p.qty }));

        const case_items = Object.values(byProduct)
          .filter((p) => p.unit_type === "case")
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => ({ name: p.name, size: p.size, pack: p.pack, qty: p.qty }));

        return {
          id: order.id,
          created_at: order.created_at,
          total_price: order.total_price,
          status: order.status,
          itemsRaw: (items ?? []) as Array<Record<string, unknown>>,
          customer_name: profile?.full_name ?? null,
          address: profile?.address ?? null,
          contact_number: profile?.contact_number ?? null,
          bottle_quantity,
          case_quantity,
          bottle_items,
          case_items,
        };
      })
    );
    if (!profilesFetchFailed) setOrdersError(null);
    setOrdersLoading(false);
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
        router.replace("/home");
        return;
      }

      if (!isMounted) return;
      setDisplayName(
        ((user.user_metadata?.full_name as string | undefined) ?? "Admin").trim() ||
          "Admin"
      );
      setLoading(false);
      await fetchOrders();

      const channel = supabase
        .channel("admin-orders-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => {
            void fetchOrders();
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

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setOrdersMessage(null);
    setOrdersError(null);
    setActionLoadingId(orderId);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setOrdersError("Supabase is not configured.");
      setActionLoadingId(null);
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus } as never)
      .eq("id", orderId);

    if (error) {
      setOrdersError(error.message);
      setActionLoadingId(null);
      return;
    }

    setOrdersMessage("Order status updated.");
    setActionLoadingId(null);
    setEditingQuantitiesOrderId(null);
    setQuantityDraft({});
    await fetchOrders();
  };

  const handleUpdateOrderQuantities = async (orderId: string) => {
    setOrdersMessage(null);
    setOrdersError(null);
    setActionLoadingId(orderId);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setOrdersError("Supabase is not configured.");
      setActionLoadingId(null);
      return;
    }

    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      setOrdersError("Order not found.");
      setActionLoadingId(null);
      return;
    }

    // Update the `items` JSON by applying draft totals per (name + unit_type).
    // If there are multiple DB rows for the same (name + unit_type), we distribute
    // the new total proportionally to preserve relative quantities.
    const updatedItems = (order.itemsRaw ?? []).map((it: any) => ({ ...it }));

    const entries = Object.entries(quantityDraft);
    for (const [key, desiredTotalRaw] of entries) {
      const desiredTotal = Math.max(
        0,
        Math.round(Number.isFinite(desiredTotalRaw) ? desiredTotalRaw : 0)
      );

      const parts = key.split("__");
      if (parts.length < 4) continue;

      const unitType = parts.pop()!.toLowerCase(); // bottle | case
      const pack = parts.pop()!.trim();
      const size = parts.pop()!.trim();
      const name = parts.join("__").trim();

      const matchedIndices: number[] = [];
      let currentSum = 0;

      for (let i = 0; i < updatedItems.length; i++) {
        const it = updatedItems[i] as any;
        const itUnitType = String(it.unit_type ?? it.unitType ?? "")
          .toLowerCase()
          .trim();
        const itName = String(it.name ?? "").trim();
        const itSize = String(it.size ?? "").trim();
        const itPack = String(it.pack ?? "").trim();
        if (
          itUnitType === unitType &&
          itName === name &&
          itSize === size &&
          itPack === pack
        ) {
          matchedIndices.push(i);
          currentSum += Number(it.quantity ?? 0);
        }
      }

      if (matchedIndices.length === 0) {
        if (desiredTotal > 0) {
          updatedItems.push({
            unit_type: unitType,
            name,
            size,
            pack,
            quantity: desiredTotal,
          });
        }
        continue;
      }

      if (desiredTotal === 0) {
        for (const idx of matchedIndices) {
          (updatedItems[idx] as any).quantity = 0;
        }
        continue;
      }

      if (currentSum <= 0) {
        // Avoid divide-by-zero: put the whole total into the first match.
        for (let j = 0; j < matchedIndices.length; j++) {
          (updatedItems[matchedIndices[j]] as any).quantity = j === 0 ? desiredTotal : 0;
        }
        continue;
      }

      const oldQuantities = matchedIndices.map(
        (idx) => Number((updatedItems[idx] as any).quantity ?? 0) || 0
      );
      const scaled = oldQuantities.map(
        (q) => (q * desiredTotal) / currentSum
      );
      const floors = scaled.map((x) => Math.floor(x));
      let allocated = floors.reduce((sum, x) => sum + x, 0);
      let remainder = desiredTotal - allocated;

      // Allocate remainder using largest fractional parts.
      const fracOrder = scaled
        .map((x, i) => ({ i, frac: x - Math.floor(x) }))
        .sort((a, b) => b.frac - a.frac)
        .map((x) => x.i);

      const allocations = floors.slice();
      while (remainder > 0) {
        for (const i of fracOrder) {
          if (remainder <= 0) break;
          allocations[i] += 1;
          remainder -= 1;
        }
        if (fracOrder.length === 0) break;
      }

      for (let j = 0; j < matchedIndices.length; j++) {
        (updatedItems[matchedIndices[j]] as any).quantity = Math.max(
          0,
          allocations[j]
        );
      }
    }

    const recalculatedTotal = updatedItems.reduce((sum, item) => {
      const qty = Number((item as any).quantity ?? 0);
      const unitPrice = Number((item as any).unit_price ?? 0);
      if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return sum;
      return sum + Math.max(0, qty) * unitPrice;
    }, 0);

    const { error } = await supabase
      .from("orders")
      .update({ items: updatedItems, total_price: recalculatedTotal } as never)
      .eq("id", orderId);

    if (error) {
      setOrdersError(error.message);
      setActionLoadingId(null);
      return;
    }

    setOrdersMessage("Order quantities updated.");
    setActionLoadingId(null);
    setEditingQuantitiesOrderId(null);
    setQuantityDraft({});
    await fetchOrders();
  };

  const handleStartEditingQuantities = (order: AdminOrderRow) => {
    setEditingQuantitiesOrderId(order.id);
    const draft: Record<string, number> = {};
    for (const it of order.bottle_items) {
      draft[`${it.name}__${it.size}__${it.pack}__bottle`] = it.qty;
    }
    for (const it of order.case_items) {
      draft[`${it.name}__${it.size}__${it.pack}__case`] = it.qty;
    }
    setQuantityDraft(draft);
  };

  const handleCancelEditingQuantities = () => {
    setEditingQuantitiesOrderId(null);
    setQuantityDraft({});
  };

  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = window.confirm("Remove this order?");
    if (!confirmed) return;

    setOrdersMessage(null);
    setOrdersError(null);
    setActionLoadingId(orderId);
    setEditingQuantitiesOrderId(null);
    setQuantityDraft({});

    const supabase = getSupabaseClient();
    if (!supabase) {
      setOrdersError("Supabase is not configured.");
      setActionLoadingId(null);
      return;
    }

    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      setOrdersError(error.message);
      setActionLoadingId(null);
      return;
    }

    setOrdersMessage("Order removed.");
    setActionLoadingId(null);
    await fetchOrders();
  };

  const pendingOrders = orders.filter(
    (order) => (order.status ?? "").toLowerCase() === "pending"
  );
  const archivedOrders = orders.filter((order) => {
    const status = (order.status ?? "").toLowerCase();
    return status === "delivered" || status === "cancelled";
  });
  const activeOrders = orders.filter((order) => {
    const status = (order.status ?? "").toLowerCase();
    return status !== "delivered" && status !== "cancelled";
  });

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

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Manage Orders
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review pending orders, update status, and remove orders.
          </p>

          {ordersError ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {ordersError}
            </p>
          ) : null}
          {ordersMessage ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {ordersMessage}
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm text-slate-700">
            Pending orders:{" "}
            <span className="font-semibold text-slate-900">
              {pendingOrders.length.toLocaleString()}
            </span>
          </div>

          {ordersLoading ? (
            <p className="mt-6 text-sm text-slate-600">Loading orders...</p>
          ) : activeOrders.length === 0 ? (
            <p className="mt-6 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
              No active orders found.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="mt-6 space-y-3 sm:hidden">
                {activeOrders.map((order) => {
                  const expanded = expandedOrderId === order.id;
                  const isDelivered = isDeliveredStatus(order.status);
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm"
                    >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                            Customer
                          </p>
                          <p className="text-sm font-semibold text-slate-900 break-words">
                            {order.customer_name ?? "-"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                          Address
                        </p>
                        <p className="text-sm text-slate-600 break-words">
                          {order.address ?? "-"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                          Contact
                        </p>
                        <p className="text-sm text-slate-600 break-words">
                          {order.contact_number ?? "-"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                          Total
                        </p>
                        <p className="text-sm font-semibold text-slate-900 break-words">
                          ₱{formatCurrency(order.total_price)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                          Status
                        </p>
                        <select
                          value={getAdminStatusValue(order.status)}
                          onChange={(event) =>
                            void handleUpdateStatus(order.id, event.target.value)
                          }
                          disabled={actionLoadingId === order.id || isDelivered}
                          className="h-10 w-full rounded-lg border border-sky-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            (() => {
                              const nextExpanded = expanded ? null : order.id;
                              setExpandedOrderId(nextExpanded);
                              if (expanded && editingQuantitiesOrderId === order.id) {
                                handleCancelEditingQuantities();
                              }
                            })()
                          }
                          className="flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <span
                              aria-hidden={true}
                              className={`inline-block transition-transform duration-200 ${
                                expanded ? "rotate-90" : "rotate-0"
                              }`}
                            >
                              ▶
                            </span>
                            {expanded ? "Hide details" : "View details"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDeleteOrder(order.id)}
                          disabled={actionLoadingId === order.id}
                          className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                        >
                          {actionLoadingId === order.id ? "Working..." : "Remove"}
                        </button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/30 p-3">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                            Order info
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-slate-600">
                            Order ID: {order.id}
                          </p>
                          <p className="text-sm text-slate-600">
                            Total: ₱{formatCurrency(order.total_price)}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                            Bottles:{" "}
                            {order.bottle_quantity.toLocaleString()}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Cases: {order.case_quantity.toLocaleString()}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                              Bottles
                            </p>
                            {order.bottle_items.length === 0 ? (
                              <p className="text-sm text-slate-600">None</p>
                            ) : (
                              editingQuantitiesOrderId === order.id ? (
                                <div className="space-y-2">
                                  {order.bottle_items.map((it) => {
                                    const key = `${it.name}__${it.size}__${it.pack}__bottle`;
                                    return (
                                      <label
                                        key={key}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-sky-100 bg-white px-3 py-2"
                                      >
                                        <span className="min-w-0 truncate text-xs font-semibold text-slate-700">
                                          {it.name} • {it.size}
                                        </span>
                                        <input
                                          type="number"
                                          min={0}
                                          step={1}
                                          value={quantityDraft[key] ?? it.qty}
                                          onChange={(e) => {
                                            const next = Number(
                                              e.target.value ?? 0
                                            );
                                            setQuantityDraft((prev) => ({
                                              ...prev,
                                              [key]: Number.isFinite(next)
                                                ? next
                                                : 0,
                                            }));
                                          }}
                                          className="w-20 rounded-lg border border-sky-200 px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-sky-400"
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {order.bottle_items.map((it) => (
                                    <span
                                      key={`m-bottle-${it.name}`}
                                      className="inline-flex items-center rounded-full border border-sky-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                                    >
                                      {it.name} x{it.qty} • {it.size}
                                    </span>
                                  ))}
                                </div>
                              )
                            )}
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
                              Cases
                            </p>
                            {order.case_items.length === 0 ? (
                              <p className="text-sm text-slate-600">None</p>
                            ) : (
                              editingQuantitiesOrderId === order.id ? (
                                <div className="space-y-2">
                                  {order.case_items.map((it) => {
                                    const key = `${it.name}__${it.size}__${it.pack}__case`;
                                    return (
                                      <label
                                        key={key}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-white px-3 py-2"
                                      >
                                        <span className="min-w-0 truncate text-xs font-semibold text-slate-700">
                                          {it.name} • {it.size}
                                        </span>
                                        <input
                                          type="number"
                                          min={0}
                                          step={1}
                                          value={quantityDraft[key] ?? it.qty}
                                          onChange={(e) => {
                                            const next = Number(
                                              e.target.value ?? 0
                                            );
                                            setQuantityDraft((prev) => ({
                                              ...prev,
                                              [key]: Number.isFinite(next)
                                                ? next
                                                : 0,
                                            }));
                                          }}
                                          className="w-20 rounded-lg border border-emerald-200 px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400"
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {order.case_items.map((it) => (
                                    <span
                                      key={`m-case-${it.name}`}
                                      className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                                    >
                                      {it.name} x{it.qty} • {it.size}
                                    </span>
                                  ))}
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {editingQuantitiesOrderId === order.id ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={actionLoadingId === order.id}
                              onClick={() =>
                                void handleUpdateOrderQuantities(order.id)
                              }
                              className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                            >
                              {actionLoadingId === order.id
                                ? "Saving..."
                                : "Save quantities"}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === order.id}
                              onClick={handleCancelEditingQuantities}
                              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <button
                              type="button"
                              disabled={actionLoadingId === order.id}
                              onClick={() =>
                                handleStartEditingQuantities(order)
                              }
                              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 disabled:opacity-60"
                            >
                              Edit quantities
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                    );
                  })}
                </div>

                <div className="hidden sm:block">
                  <table className="min-w-full text-left text-xs sm:text-sm">
                    <thead className="bg-sky-50 text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Address</th>
                        <th className="px-4 py-3 font-semibold">Contact</th>
                        <th className="px-4 py-3 font-semibold">Total</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOrders.map((order) => {
                        const expanded = expandedOrderId === order.id;
                        const isDelivered = isDeliveredStatus(order.status);
                        return (
                          <Fragment key={order.id}>
                        <tr className="border-t border-sky-100">
                          <td className="px-4 py-3 text-slate-800 break-words">
                            {order.customer_name ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 break-words">
                            {order.address ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 break-words">
                            {order.contact_number ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            ₱{formatCurrency(order.total_price)}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={getAdminStatusValue(order.status)}
                              onChange={(event) =>
                                void handleUpdateStatus(order.id, event.target.value)
                              }
                              disabled={actionLoadingId === order.id || isDelivered}
                              className="h-9 w-full sm:w-auto rounded-lg border border-sky-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  (() => {
                                    const nextExpanded = expanded ? null : order.id;
                                    setExpandedOrderId(nextExpanded);
                                    if (
                                      expanded &&
                                      editingQuantitiesOrderId === order.id
                                    ) {
                                      handleCancelEditingQuantities();
                                    }
                                  })()
                                }
                                className="rounded-lg border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-sky-50"
                                aria-expanded={expanded}
                              >
                                <span className="inline-flex items-center gap-1">
                                  <span
                                    aria-hidden={true}
                                    className={`inline-block transition-transform duration-200 ${
                                      expanded ? "rotate-90" : "rotate-0"
                                    }`}
                                  >
                                    ▶
                                  </span>
                                  {expanded ? "Hide details" : "View details"}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDeleteOrder(order.id)}
                                disabled={actionLoadingId === order.id}
                                className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                              >
                                {actionLoadingId === order.id ? "Working..." : "Remove"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expanded ? (
                          <tr className="bg-sky-50/30">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="rounded-2xl border border-sky-100 bg-white p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="space-y-1">
                                    <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
                                      Order info
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {new Date(order.created_at).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      Order ID: {order.id}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      Total: ₱{formatCurrency(order.total_price)}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                                      Bottles:{" "}
                                      {order.bottle_quantity.toLocaleString()}
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
                                      editingQuantitiesOrderId === order.id ? (
                                        <div className="space-y-2">
                                          {order.bottle_items.map((it) => {
                                            const key = `${it.name}__${it.size}__${it.pack}__bottle`;
                                            return (
                                              <label
                                                key={key}
                                                className="flex items-center justify-between gap-3 rounded-lg border border-sky-100 bg-white px-3 py-2"
                                              >
                                                <span className="min-w-0 truncate text-xs font-semibold text-slate-700">
                                                  {it.name} • {it.size}
                                                </span>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  step={1}
                                                  value={
                                                    quantityDraft[key] ??
                                                    it.qty
                                                  }
                                                  onChange={(e) => {
                                                    const next = Number(
                                                      e.target.value ?? 0
                                                    );
                                                    setQuantityDraft((prev) => ({
                                                      ...prev,
                                                      [key]: Number.isFinite(next)
                                                        ? next
                                                        : 0,
                                                    }));
                                                  }}
                                                  className="w-24 rounded-lg border border-sky-200 px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-sky-400"
                                                />
                                              </label>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {order.bottle_items.map((it) => (
                                            <span
                                              key={`desk-bottle-${it.name}`}
                                              className="inline-flex items-center rounded-full border border-sky-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                                            >
                                              {it.name} x{it.qty} • {it.size}
                                            </span>
                                          ))}
                                        </div>
                                      )
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
                                      Cases
                                    </p>
                                    {order.case_items.length === 0 ? (
                                      <p className="text-sm text-slate-600">None</p>
                                    ) : (
                                      editingQuantitiesOrderId === order.id ? (
                                        <div className="space-y-2">
                                          {order.case_items.map((it) => {
                                            const key = `${it.name}__${it.size}__${it.pack}__case`;
                                            return (
                                              <label
                                                key={key}
                                                className="flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-white px-3 py-2"
                                              >
                                                <span className="min-w-0 truncate text-xs font-semibold text-slate-700">
                                                  {it.name} • {it.size}
                                                </span>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  step={1}
                                                  value={
                                                    quantityDraft[key] ??
                                                    it.qty
                                                  }
                                                  onChange={(e) => {
                                                    const next = Number(
                                                      e.target.value ?? 0
                                                    );
                                                    setQuantityDraft((prev) => ({
                                                      ...prev,
                                                      [key]: Number.isFinite(next)
                                                        ? next
                                                        : 0,
                                                    }));
                                                  }}
                                                  className="w-24 rounded-lg border border-emerald-200 px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400"
                                                />
                                              </label>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {order.case_items.map((it) => (
                                            <span
                                              key={`desk-case-${it.name}`}
                                              className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                                            >
                                              {it.name} x{it.qty} • {it.size}
                                            </span>
                                          ))}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>

                                {editingQuantitiesOrderId === order.id ? (
                                  <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={actionLoadingId === order.id}
                                      onClick={() =>
                                        void handleUpdateOrderQuantities(order.id)
                                      }
                                      className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                                    >
                                      {actionLoadingId === order.id
                                        ? "Saving..."
                                        : "Save quantities"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={actionLoadingId === order.id}
                                      onClick={handleCancelEditingQuantities}
                                      className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-4">
                                    <button
                                      type="button"
                                      disabled={actionLoadingId === order.id}
                                      onClick={() =>
                                        handleStartEditingQuantities(order)
                                      }
                                      className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 disabled:opacity-60"
                                    >
                                      Edit quantities
                                    </button>
                                  </div>
                                )}
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
            </div>
          )}

          {archivedOrders.length > 0 ? (
            <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 [&[open]_.archived-arrow]:rotate-90">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden={true}
                    className="archived-arrow inline-block transition-transform duration-200"
                  >
                    ▶
                  </span>
                  Archived Orders (Delivered/Cancelled): {archivedOrders.length}
                </span>
              </summary>
              <p className="mt-2 text-xs text-slate-600">
                Open each dropdown if you want to see the full details.
              </p>
              <div className="mt-4 space-y-3">
                {archivedOrders.map((order) => (
                  <details
                    key={`archived-${order.id}`}
                    className="rounded-xl border border-slate-200 bg-white p-3 [&[open]_.archived-item-arrow]:rotate-90"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <span
                            aria-hidden={true}
                            className="archived-item-arrow inline-block transition-transform duration-200"
                          >
                            ▶
                          </span>
                          {order.customer_name ?? "-"}
                        </p>
                        <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {getAdminStatusValue(order.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {new Date(order.created_at).toLocaleString()} • ₱
                        {formatCurrency(order.total_price)}
                      </p>
                    </summary>

                    <div className="mt-3 space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                      <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-800">Order ID:</span> {order.id}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Contact:</span>{" "}
                          {order.contact_number ?? "-"}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="font-semibold text-slate-800">Address:</span>{" "}
                          {order.address ?? "-"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                          Bottles
                        </p>
                        {order.bottle_items.length === 0 ? (
                          <p className="text-sm text-slate-600">None</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {order.bottle_items.map((it) => (
                              <span
                                key={`archived-bottle-${order.id}-${it.name}-${it.size}-${it.pack}`}
                                className="inline-flex items-center rounded-full border border-sky-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {it.name} x{it.qty} • {it.size}
                              </span>
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
                          <div className="flex flex-wrap gap-2">
                            {order.case_items.map((it) => (
                              <span
                                key={`archived-case-${order.id}-${it.name}-${it.size}-${it.pack}`}
                                className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {it.name} x{it.qty} • {it.size}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ) : null}
        </section>
      </main>
    </div>
  );
}
