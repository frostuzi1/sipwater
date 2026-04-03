export function formatOrderStatus(status: string | null | undefined) {
  const normalized = (status ?? "").trim();
  if (!normalized) return "";
  const lower = normalized.toLowerCase();
  if (lower === "pending" || lower === "preparing your order") {
    return "Preparing your order";
  }
  if (lower === "on the way" || lower === "out for delivery") {
    return "Out for delivery";
  }
  if (lower === "delivered") {
    return "Delivered";
  }
  if (lower === "cancelled") {
    return "Cancelled";
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function formatOrderItemSize(size: string) {
  return size.replace(/\bml\b/gi, "mL").replace(/\bl\b/g, "L");
}

export function formatOrderCurrency(amount: number) {
  return Number(amount ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
