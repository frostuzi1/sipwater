const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OrderItemPayload = {
  product_id: string;
  name: string;
  size: string;
  pack: string;
  unit_type: string;
  unit_price: number;
  quantity: number;
};

export type PlaceOrderBody = {
  idempotency_key: string;
  total_price: number;
  items: OrderItemPayload[];
};

const MAX_STRING = 500;
const MAX_ITEMS = 100;
const MAX_QTY = 500;
const MAX_UNIT_PRICE = 10_000_000;
const TOTAL_EPSILON = 0.02;

export function validateIdempotencyKey(key: unknown): string | null {
  if (typeof key !== "string" || !UUID_RE.test(key.trim())) {
    return null;
  }
  return key.trim();
}

export function validateOrderPayload(body: unknown): {
  ok: true;
  data: PlaceOrderBody;
} | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body." };
  }

  const o = body as Record<string, unknown>;
  const idem = validateIdempotencyKey(o.idempotency_key);
  if (!idem) {
    return { ok: false, error: "idempotency_key must be a UUID string." };
  }

  const total_price = Number(o.total_price);
  if (!Number.isFinite(total_price) || total_price <= 0 || total_price > MAX_UNIT_PRICE * MAX_QTY * MAX_ITEMS) {
    return { ok: false, error: "total_price is invalid." };
  }

  if (!Array.isArray(o.items)) {
    return { ok: false, error: "items must be an array." };
  }
  if (o.items.length === 0 || o.items.length > MAX_ITEMS) {
    return { ok: false, error: "items must have 1–100 entries." };
  }

  const items: OrderItemPayload[] = [];
  let computed = 0;

  for (const raw of o.items) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Each item must be an object." };
    }
    const it = raw as Record<string, unknown>;

    const product_id = String(it.product_id ?? "").trim();
    if (!product_id || product_id.length > 80) {
      return { ok: false, error: "Invalid product_id." };
    }

    const name = String(it.name ?? "").trim();
    const size = String(it.size ?? "").trim();
    const pack = String(it.pack ?? "").trim();
    if (!name || name.length > MAX_STRING) {
      return { ok: false, error: "Invalid item name." };
    }
    if (size.length > MAX_STRING || pack.length > MAX_STRING) {
      return { ok: false, error: "Invalid size or pack." };
    }

    const unit_type = String(it.unit_type ?? "").toLowerCase().trim();
    if (unit_type !== "bottle" && unit_type !== "case") {
      return { ok: false, error: "unit_type must be bottle or case." };
    }

    const unit_price = Number(it.unit_price);
    const quantity = Number(it.quantity);
    if (!Number.isFinite(unit_price) || unit_price <= 0 || unit_price > MAX_UNIT_PRICE) {
      return { ok: false, error: "Invalid unit_price." };
    }
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY || !Number.isInteger(quantity)) {
      return { ok: false, error: "Invalid quantity." };
    }

    computed += unit_price * quantity;
    items.push({
      product_id,
      name,
      size,
      pack,
      unit_type,
      unit_price,
      quantity,
    });
  }

  if (Math.abs(computed - total_price) > TOTAL_EPSILON) {
    return {
      ok: false,
      error: "total_price does not match line items.",
    };
  }

  return {
    ok: true,
    data: { idempotency_key: idem, total_price, items },
  };
}
