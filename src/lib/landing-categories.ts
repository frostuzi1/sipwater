/** Client-facing category labels — navbar, landing, category pages, admin catalog. */
export const LANDING_CATEGORY_NAV = [
  "Purified Water",
  "Yoghurt Drinks",
  "Carbonated Drinks",
  "Snacks",
] as const;

const categoryLabelToSlug = (category: string) =>
  category.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Navbar / deep links — same routes as category shop pages. */
export function getClientCategoryNavLinks(): Array<{ label: string; href: string }> {
  return LANDING_CATEGORY_NAV.map((label) => ({
    label,
    href: `/category/${categoryLabelToSlug(label)}`,
  }));
}

const normalizeName = (value: string) => value.trim().toLowerCase();

/** Maps DB / legacy category strings to a landing nav label. */
export function getLandingCategoryLabel(
  sourceCategory: string,
  productName: string
): (typeof LANDING_CATEGORY_NAV)[number] {
  const trimmed = sourceCategory.trim();
  if ((LANDING_CATEGORY_NAV as readonly string[]).includes(trimmed)) {
    return trimmed as (typeof LANDING_CATEGORY_NAV)[number];
  }

  const category = sourceCategory.toLowerCase();
  const name = normalizeName(productName);

  if (category.includes("kaman") || name.includes("egg roll")) return "Snacks";
  if (
    category.includes("sparkling") ||
    category.includes("vida") ||
    category.includes("nutrifizz") ||
    category.includes("prebiotic") ||
    category.includes("carbonated") ||
    name.includes("lemon lime prebiotic") ||
    name.includes("yogurt soda prebiotic") ||
    name.includes("yoghurt soda prebiotic")
  ) {
    return "Carbonated Drinks";
  }
  if (
    category.includes("yobick") ||
    category.includes("deedo") ||
    category.includes("yoghurt drink") ||
    category.includes("yogurt drink")
  ) {
    return "Yoghurt Drinks";
  }
  if (
    category.includes("electrolyte") ||
    category.includes("purified") ||
    category.includes("drinking water")
  ) {
    return "Purified Water";
  }
  return "Purified Water";
}

export function landingCategorySortIndex(
  sourceCategory: string,
  productName: string
): number {
  const label = getLandingCategoryLabel(sourceCategory, productName);
  const idx = (LANDING_CATEGORY_NAV as readonly string[]).indexOf(label);
  return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
}
