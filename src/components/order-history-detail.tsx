import { getClientSubcategoryDisplayLabel } from "@/lib/catalog-product-order";
import type { OrderRow } from "@/lib/map-order-row";
import {
  formatOrderCurrency,
  formatOrderItemSize,
  formatOrderStatus,
} from "@/lib/order-display";

function OrderLineSubcategory({ name, size }: { name: string; size: string }) {
  const sub = getClientSubcategoryDisplayLabel(name, size);
  if (!sub) return null;
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">
      {sub}
    </p>
  );
}

export function OrderHistoryDetailPanel({ order }: { order: OrderRow }) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/30 p-3 sm:p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
            Order details
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {new Date(order.created_at).toLocaleString()}
          </p>
          <p className="text-sm text-slate-600">Order ID: {order.id}</p>
          <p className="text-sm text-slate-600">
            Total: ₱{formatOrderCurrency(order.total_price)}
          </p>
          <p className="text-sm font-semibold text-sky-800">
            Status: {formatOrderStatus(order.status)}
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
            Bottles / packs
          </p>
          {order.bottle_items.length === 0 ? (
            <p className="text-sm text-slate-600">None</p>
          ) : (
            <div className="space-y-2">
              {order.bottle_items.map((it) => (
                <div
                  key={`bottle-${it.name}-${it.size}`}
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
                    <OrderLineSubcategory name={it.name} size={it.size} />
                    <p className="text-xs font-semibold text-slate-800">
                      {it.name} ({formatOrderItemSize(it.size)})
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-700">
                      <span>₱{Number(it.unit_price ?? 0).toFixed(2)}/pc</span>
                      <span>Qty: {it.qty}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Line: ₱{(it.unit_price * it.qty).toFixed(2)}
                    </p>
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
                  key={`case-${it.name}-${it.size}`}
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
                    <OrderLineSubcategory name={it.name} size={it.size} />
                    <p className="text-xs font-semibold text-slate-800">
                      {it.name} ({formatOrderItemSize(it.size)})
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-700">
                      <span>₱{Number(it.unit_price ?? 0).toFixed(2)}/case</span>
                      <span>Qty: {it.qty}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Line: ₱{(it.unit_price * it.qty).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
