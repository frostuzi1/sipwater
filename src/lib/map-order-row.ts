export type OrderItem = {
  product_id?: string | null;
  unit_type?: string | null;
  name?: string | null;
  size?: string | null;
  pack?: string | null;
  unit_price?: number | string | null;
  quantity?: number | null;
};

export type OrderRow = {
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

type RawOrder = {
  id: string;
  created_at: string;
  total_price: number | string | null;
  status: string | null;
  items?: OrderItem[] | null;
};

/** Maps a Supabase `orders` row + product photo lookup into client order shape. */
export function mapRawOrderToClientRow(
  order: RawOrder,
  productPhotoById: Map<string, string | null>
): OrderRow {
  const items = Array.isArray(order.items) ? order.items : [];

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
}
