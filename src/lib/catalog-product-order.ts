const norm = (s: string) => s.trim().toLowerCase();

export type PurifiedWaterSubcategory =
  | "purified-drinking-water"
  | "sip-plus-electrolyte";

/**
 * Splits Purified Water products into SIP bottle sizes vs SIP Plus electrolyte SKUs.
 */
export function getPurifiedWaterSubcategory(
  name: string,
  size: string
): PurifiedWaterSubcategory {
  const n = norm(name);
  const sz = norm(size);

  if (n.includes("sip purified water")) {
    return "purified-drinking-water";
  }
  if (
    n.includes("purified water") &&
    !n.includes("grapefruit") &&
    !n.includes("yuzo") &&
    !n.includes("electrolyte")
  ) {
    if (/\b350\b/.test(sz) || /\b500\b/.test(sz) || /\b1000\b/.test(sz)) {
      return "purified-drinking-water";
    }
  }
  if (n.includes("original grapefruit") || (n.includes("grapefruit") && n.includes("original"))) {
    return "sip-plus-electrolyte";
  }
  if (n.includes("honey yuzo") || (n.includes("yuzo") && n.includes("honey"))) {
    return "sip-plus-electrolyte";
  }
  if (n.includes("electrolyte")) {
    return "sip-plus-electrolyte";
  }
  return "purified-drinking-water";
}

export type YoghurtSubcategory = "yobick-yoghurt-drink" | "deedo-juice-with-yoghurt";

/**
 * Splits Yoghurt Drinks into Yobick vs Deedo product lines.
 */
export function getYoghurtSubcategory(name: string, _size: string): YoghurtSubcategory {
  const n = norm(name);
  if (n.includes("yobick")) {
    return "yobick-yoghurt-drink";
  }
  if (n.includes("deedo")) {
    return "deedo-juice-with-yoghurt";
  }
  if (n.includes("grape") || n.includes("orange")) {
    return "deedo-juice-with-yoghurt";
  }
  return "yobick-yoghurt-drink";
}

export type CarbonatedSubcategory = "vida-zero-sparkling" | "nutrifizz-prebiotic";

/**
 * Splits Carbonated Drinks into Vida Zero vs Nutrifizz product lines.
 */
export function getCarbonatedSubcategory(
  name: string,
  _size: string
): CarbonatedSubcategory {
  const n = norm(name);
  if (n.includes("nutrifizz")) {
    return "nutrifizz-prebiotic";
  }
  if (n.includes("lemon lime")) {
    return "nutrifizz-prebiotic";
  }
  if (n.includes("yoghurt soda") || n.includes("yogurt soda")) {
    return "nutrifizz-prebiotic";
  }
  if (n.includes("salty lychee") || n.includes("original citrus")) {
    return "vida-zero-sparkling";
  }
  if (n.includes("vida") || n.includes("sparkling")) {
    return "vida-zero-sparkling";
  }
  if (/\blemon\b/.test(n) && !n.includes("lime")) {
    return "vida-zero-sparkling";
  }
  return "vida-zero-sparkling";
}

export type SnacksSubcategory = "kaman";

/**
 * Snacks are grouped under Kaman (Coconut Ice Cream Egg Roll, Egg Yolk Egg Roll, etc.).
 */
export function getSnacksSubcategory(_name: string, _size: string): SnacksSubcategory {
  return "kaman";
}

/**
 * Human-readable catalog subcategory for order history / receipts (derived from name + size).
 */
export function getClientSubcategoryDisplayLabel(name: string, size: string): string {
  const n = norm(name);

  if (n.includes("kaman") || n.includes("egg roll")) {
    return "Kaman";
  }

  if (
    n.includes("nutrifizz") ||
    n.includes("lemon lime") ||
    n.includes("yoghurt soda") ||
    n.includes("yogurt soda")
  ) {
    return "Nutrifizz Prebiotic Soda Drinks";
  }
  if (
    n.includes("salty lychee") ||
    n.includes("original citrus") ||
    n.includes("vida") ||
    n.includes("sparkling")
  ) {
    return "Vida Zero Sparkling Drinks";
  }
  if (/\blemon\b/.test(n) && !n.includes("lime")) {
    return "Vida Zero Sparkling Drinks";
  }

  if (n.includes("yobick")) {
    return "Yobick Yoghurt Drink";
  }
  if (n.includes("deedo")) {
    return "Deedo Juice with Yoghurt";
  }
  if (
    (n.includes("grape") || n.includes("orange")) &&
    !n.includes("grapefruit") &&
    !n.includes("original citrus")
  ) {
    return "Deedo Juice with Yoghurt";
  }

  const pw = getPurifiedWaterSubcategory(name, size);
  if (pw === "sip-plus-electrolyte") {
    return "SIP Plus Electrolyte Drinks";
  }
  if (pw === "purified-drinking-water") {
    return "Purified Drinking Water";
  }

  return "";
}

/**
 * Lower rank = earlier in the catalog. Unknown items sort after (tie-break by label).
 */
export function getCatalogItemOrderRank(
  categoryLabel: string,
  name: string,
  size: string
): number {
  const n = norm(name);
  const sz = norm(size);

  if (categoryLabel === "Purified Water") {
    if (n.includes("sip purified water")) {
      if (/\b350\b/.test(sz)) return 0;
      if (/\b500\b/.test(sz)) return 1;
      if (/\b1000\b/.test(sz)) return 2;
    }
    if (
      n.includes("purified water") &&
      !n.includes("grapefruit") &&
      !n.includes("yuzo") &&
      !n.includes("electrolyte")
    ) {
      if (/\b350\b/.test(sz)) return 0;
      if (/\b500\b/.test(sz)) return 1;
      if (/\b1000\b/.test(sz)) return 2;
    }
    if (n.includes("original grapefruit") || (n.includes("grapefruit") && n.includes("original"))) {
      return 3;
    }
    if (n.includes("honey yuzo") || (n.includes("yuzo") && n.includes("honey"))) {
      return 4;
    }
    return 100;
  }

  if (categoryLabel === "Yoghurt Drinks") {
    if (n.includes("yobick")) return 0;
    if (n.includes("deedo") && n.includes("grape")) return 1;
    if (n.includes("deedo") && (n.includes("orange") || n.includes("citrus"))) return 2;
    return 50;
  }

  if (categoryLabel === "Carbonated Drinks") {
    if (n.includes("salty lychee")) return 0;
    if (n.includes("original citrus")) return 1;
    if (n.includes("lemon lime")) return 3;
    if (n.includes("yoghurt soda") || n.includes("yogurt soda")) return 4;
    if (/\blemon\b/.test(n) && !n.includes("lime")) return 2;
    return 50;
  }

  if (categoryLabel === "Snacks") {
    if (n.includes("coconut") || n.includes("ice cream")) return 0;
    if (n.includes("egg yolk") || (n.includes("yolk") && n.includes("egg"))) return 1;
    return 50;
  }

  return 500;
}

export function compareCatalogProducts(
  categoryLabel: string,
  a: { name: string; size: string },
  b: { name: string; size: string }
): number {
  const ra = getCatalogItemOrderRank(categoryLabel, a.name, a.size);
  const rb = getCatalogItemOrderRank(categoryLabel, b.name, b.size);
  if (ra !== rb) return ra - rb;
  return `${a.name} ${a.size}`.localeCompare(`${b.name} ${b.size}`, undefined, {
    sensitivity: "base",
  });
}

export function sortCatalogProductsInCategory<T extends { name: string; size: string }>(
  categoryLabel: string,
  items: T[]
): T[] {
  return [...items].sort((a, b) => compareCatalogProducts(categoryLabel, a, b));
}
