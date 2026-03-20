"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { BadgeCheck, Droplets, Leaf, Truck } from "lucide-react";

import { isAdminEmail } from "@/lib/admin";
import { setFlashMessage } from "@/lib/flash-message";
import { Navbar } from "@/components/navbar";
import { getSupabaseClient } from "@/lib/supabase";

type ProductCard = {
  id: string;
  category: string;
  name: string;
  size: string;
  pack: string;
  bottlePrice: number;
  casePrice: number;
  photoUrl: string | null;
};

type ProductGroup = {
  category: string;
  items: ProductCard[];
};

type CartItem = {
  key: string;
  productId: string;
  category?: string;
  name: string;
  size: string;
  pack: string;
  photoUrl?: string | null;
  unitType: "bottle" | "case";
  unitPrice: number;
  quantity: number;
};

const categoryOrderMap = new Map<string, number>([
  ["Purified Drinking Water", 0],
  ["SIP Plus Electrolyte Drinks", 1],
  ["Vida Zero Sparkling Drinks", 2],
  ["Yobick Yoghurt Drink", 3],
  ["Deedo Juice with Yogurt", 4],
  ["Nutrifizz Prebiotic Soda Drinks", 5],
  ["Kaman", 6],
]);

const normalizeOrderKey = (value: string) =>
  value.replaceAll("×", "x").toLowerCase().trim();

const itemOrderRows: [string, number][] = [
  ["Purified Drinking Water__SIP Purified Water__350 ml__24 / case", 0],
  ["Purified Drinking Water__SIP Purified Water__500 ml__24 / case", 1],
  ["Purified Drinking Water__SIP Purified Water__1000 ml__12 / case", 2],
  [
    "SIP Plus Electrolyte Drinks__Original Grapefruit Sugar Free__350 ml__12 / case",
    0,
  ],
  [
    "SIP Plus Electrolyte Drinks__Honey Yuzo Sugar Free Electrolytes__350 ml__12 / case",
    1,
  ],
  ["Vida Zero Sparkling Drinks__Salty Lychee__325 ml__24 / case", 0],
  ["Vida Zero Sparkling Drinks__Original Citrus__325 ml__24 / case", 1],
  ["Vida Zero Sparkling Drinks__Lemon__325 ml__24 / case", 2],
  ["Yobick Yoghurt Drink__Original__310 ml__24 / case", 0],
  ["Deedo Juice with Yogurt__Grape Juice (10x6)__115 ml__10 / case", 0],
  ["Deedo Juice with Yogurt__Orange Juice (10x6)__115 ml__10 / case", 1],
  ["Nutrifizz Prebiotic Soda Drinks__Lemon Lime Prebiotic__330 ml__24 / case", 0],
  ["Nutrifizz Prebiotic Soda Drinks__Yogurt Soda Prebiotic__330 ml__24 / case", 1],
  ["Kaman__Coconut Ice Cream Egg Roll (12x20)__20 g__12 / case", 0],
  ["Kaman__Egg Yolk Egg Roll (12x20)__20 g__12 / case", 1],
];

const itemOrderMap = new Map<string, number>(
  itemOrderRows.map(([key, index]) => [normalizeOrderKey(key), index])
);
const CLIENT_CATEGORY_LABELS = [
  "Purified Water",
  "Electrolyte Drinks",
  "Sparkling Drinks",
  "Yoghurt Drinks",
  "Carbonated Drinks",
  "Snacks",
] as const;

const formatPeso = (amount: number) =>
  `₱${Number(amount ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const isKamanCategory = (category?: string) =>
  (category ?? "").trim().toLowerCase() === "kaman";
const getPrimaryUnitLabel = (category?: string) =>
  isKamanCategory(category) ? "Pack" : "Bottle";
const formatSizeLabel = (size: string) =>
  size.replace(/\bml\b/gi, "mL").replace(/\bl\b/g, "L");
const categoryToSlug = (category: string) =>
  category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const getClientCategoryLabel = (sourceCategory: string, productName: string) => {
  const category = sourceCategory.toLowerCase();
  const name = productName.trim().toLowerCase();

  if (category.includes("kaman") || name.includes("egg roll")) return "Snacks";
  if (
    category.includes("prebiotic") ||
    name.includes("lemon lime prebiotic") ||
    name.includes("yogurt soda prebiotic")
  ) {
    return "Carbonated Drinks";
  }
  if (category.includes("yobick") || category.includes("deedo")) return "Yoghurt Drinks";
  if (category.includes("electrolyte")) return "Electrolyte Drinks";
  if (category.includes("sparkling")) return "Sparkling Drinks";
  if (category.includes("purified")) return "Purified Water";
  return "Purified Water";
};

export default function TestLandingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const DISPLAY_NAME_CACHE_KEY = "sip_display_name";
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<"catalog" | "view-order">("catalog");
  const [orderStatus, setOrderStatus] = useState<
    "Draft" | "Submitting" | "Pending Confirmation"
  >("Draft");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [addOrderAlert, setAddOrderAlert] = useState<string | null>(null);
  const addOrderAlertTimeoutRef = useRef<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const syncProfile = async (params: {
    id: string;
    email: string | null;
    fullName: string;
    address: string;
    contactNumber: string;
  }) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false as const, message: "Supabase is not configured." };

    const attempts = [
      {
        id: params.id,
        full_name: params.fullName,
        address: params.address,
        phone: params.contactNumber,
      },
      {
        id: params.id,
        full_name: params.fullName,
        address: params.address,
        contact_number: params.contactNumber,
      },
      {
        id: params.id,
        full_name: params.fullName,
        address: params.address,
        contact: params.contactNumber,
      },
      {
        id: params.id,
        email: params.email,
        full_name: params.fullName,
        address: params.address,
        phone: params.contactNumber,
      },
      {
        id: params.id,
        email: params.email,
        full_name: params.fullName,
        address: params.address,
        contact_number: params.contactNumber,
      },
      {
        id: params.id,
        email: params.email,
        full_name: params.fullName,
        address: params.address,
        contact: params.contactNumber,
      },
    ];

    let lastErrorMessage = "Unknown profile sync error.";
    for (const payload of attempts) {
      const result = await supabase
        .from("profiles")
        .upsert(payload as never, { onConflict: "id" });
      if (!result.error) return { ok: true as const };
      lastErrorMessage = result.error.message;
    }

    return { ok: false as const, message: lastErrorMessage };
  };

  const cartStorageKey = userId ? `sip_cart_${userId}` : null;

  useEffect(() => {
    if (!cartStorageKey) return;
    try {
      const raw = window.localStorage.getItem(cartStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartItem[];
      // Basic shape check; fall back silently if corrupted.
      if (!Array.isArray(parsed)) return;
      const sanitized = parsed
        .map((item) => {
          const unitType =
            item.unitType === "case" ? "case" : "bottle";
          return {
            key: String(item.key ?? ""),
            productId: String(item.productId ?? ""),
            category: String(item.category ?? ""),
            name: String(item.name ?? ""),
            size: String(item.size ?? ""),
            pack: String(item.pack ?? ""),
            photoUrl:
              typeof item.photoUrl === "string" && item.photoUrl.trim()
                ? item.photoUrl
                : null,
            unitType,
            unitPrice: Number(item.unitPrice ?? 0),
            quantity: Math.max(0, Number(item.quantity ?? 0)),
          } as CartItem;
        })
        .filter((item) => item.key && item.productId && item.quantity > 0);

      if (sanitized.length > 0) setCart(sanitized);
    } catch {
      // ignore invalid localStorage values
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartStorageKey]);

  useEffect(() => {
    if (!cartStorageKey) return;
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
      // ignore write errors (e.g. storage disabled)
    }
  }, [cart, cartStorageKey]);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 280);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const openCatalogFromHash = () => {
      if (!window.location.hash.startsWith("#client-category-")) return;
      setActiveTab("catalog");
      window.setTimeout(() => {
        const section = document.getElementById(window.location.hash.slice(1));
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 0);
    };

    openCatalogFromHash();
    window.addEventListener("hashchange", openCatalogFromHash);
    return () => {
      window.removeEventListener("hashchange", openCatalogFromHash);
    };
  }, []);

  useEffect(() => {
    try {
      const cachedName = window.localStorage.getItem(DISPLAY_NAME_CACHE_KEY);
      if (cachedName) {
        setDisplayName(cachedName);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError(
          "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
        );
        setLoading(false);
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

      if (isAdminEmail(user.email)) {
        router.replace("/admin");
        return;
      }

      const fullName =
        (user.user_metadata?.full_name as string | undefined) ?? null;
      const address =
        (user.user_metadata?.address as string | undefined) ?? "";
      const rawContactNumber =
        (user.user_metadata?.contact_number as string | undefined) ??
        (user.user_metadata?.contact as string | undefined) ??
        (user.user_metadata?.phone as string | undefined) ??
        "";
      const contactNumber = String(rawContactNumber ?? "");
      setUserId(user.id);
      setDisplayName(fullName ?? user.email ?? null);
      try {
        const nameToCache = fullName ?? user.email ?? "";
        if (nameToCache) {
          window.localStorage.setItem(
            DISPLAY_NAME_CACHE_KEY,
            nameToCache
          );
        }
      } catch {
        // ignore localStorage errors
      }

      // Ensure we always have a matching `profiles` row for admin lookups.
      await syncProfile({
        id: user.id,
        email: user.email ?? null,
        fullName: fullName ?? "",
        address,
        contactNumber,
      });

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, category, size, pack, bottle_price, case_price, photo_url")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (productsError) {
        setError(`Unable to load products: ${productsError.message}`);
      } else {
        const normalizedProducts = ((productsData as Array<{
          id: string;
          name: string;
          category: string;
          size: string;
          pack: string;
          bottle_price: number;
          case_price: number;
          photo_url: string | null;
        }> | null) ?? []
        ).sort((a, b) => {
          const catA = categoryOrderMap.get(a.category) ?? Number.MAX_SAFE_INTEGER;
          const catB = categoryOrderMap.get(b.category) ?? Number.MAX_SAFE_INTEGER;
          if (catA !== catB) return catA - catB;

          const keyA = normalizeOrderKey(
            `${a.category}__${a.name}__${a.size}__${a.pack}`
          );
          const keyB = normalizeOrderKey(
            `${b.category}__${b.name}__${b.size}__${b.pack}`
          );
          const orderA = itemOrderMap.get(keyA) ?? Number.MAX_SAFE_INTEGER;
          const orderB = itemOrderMap.get(keyB) ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;

          return `${a.category} ${a.name} ${a.size}`.localeCompare(
            `${b.category} ${b.name} ${b.size}`
          );
        });

        const grouped = normalizedProducts.reduce<Record<string, ProductCard[]>>((acc, item) => {
          const sourceCategory = item.category ?? "Other Products";
          const displayCategory = getClientCategoryLabel(sourceCategory, item.name);
          if (!acc[displayCategory]) acc[displayCategory] = [];
          acc[displayCategory].push({
            id: item.id,
            category: sourceCategory,
            name: item.name,
            size: item.size,
            pack: item.pack,
            bottlePrice: Number(item.bottle_price ?? 0),
            casePrice: Number(item.case_price ?? 0),
            photoUrl: item.photo_url ?? null,
          });
          return acc;
        }, {});

        setProductGroups(
          CLIENT_CATEGORY_LABELS.map((category) => ({
            category,
            items: grouped[category] ?? [],
          })).filter((group) => group.items.length > 0)
        );
      }

      setProductsLoading(false);
      setLoading(false);
    };

    void loadUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace("/");
      return;
    }

    await supabase.auth.signOut();
    setFlashMessage("Logged out successfully.");
    try {
      window.localStorage.removeItem("sip_display_name");
    } catch {
      // ignore localStorage errors
    }
    router.replace("/");
  };

  const addToCart = (item: ProductCard, unitType: "bottle" | "case") => {
    setOrderMessage(null);
    setOrderStatus("Draft");
    const unitLabel =
      unitType === "case" ? "case" : isKamanCategory(item.category) ? "pack" : "bottle";
    setAddOrderAlert(
      `Added ${unitLabel} to order.`
    );
    if (addOrderAlertTimeoutRef.current) {
      window.clearTimeout(addOrderAlertTimeoutRef.current);
    }
    addOrderAlertTimeoutRef.current = window.setTimeout(() => {
      setAddOrderAlert(null);
    }, 2500);
    setCart((prev) => {
      const key = `${item.id}-${item.size}-${unitType}`;
      const existing = prev.find((entry) => entry.key === key);
      if (existing) {
        return prev.map((entry) =>
          entry.key === key ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }
      return [
        ...prev,
        {
          key,
          productId: item.id,
          category: item.category,
          name: item.name,
          size: item.size,
          pack: item.pack,
          photoUrl: item.photoUrl,
          unitType,
          unitPrice: unitType === "bottle" ? item.bottlePrice : item.casePrice,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (key: string, nextQuantity: number) => {
    setOrderStatus("Draft");
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, quantity: Math.max(0, nextQuantity) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const placeOrder = async () => {
    if (!cart.length) {
      setOrderMessage("Your cart is empty.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase || !userId) {
      setOrderMessage("Unable to place order right now.");
      return;
    }

    setOrderLoading(true);
    setOrderStatus("Submitting");
    setOrderMessage(null);

    const totalPrice = cart.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const payloads: Array<Record<string, unknown>> = [
      {
        user_id: userId,
        total_price: totalPrice,
        status: "pending",
        items: cart.map((item) => ({
          product_id: item.productId,
          name: item.name,
          size: item.size,
          pack: item.pack,
          unit_type: item.unitType,
          unit_price: item.unitPrice,
          quantity: item.quantity,
        })),
      },
      {
        user_id: userId,
        total_price: totalPrice,
        status: "pending",
      },
    ];

    let lastError = "Unknown order error.";
    for (const payload of payloads) {
      const { error: insertError } = await supabase.from("orders").insert(payload as never);
      if (!insertError) {
        setOrderMessage(null);
        setFlashMessage("Order placed successfully.");
        setOrderStatus("Pending Confirmation");
        setCart([]);
        setOrderLoading(false);
        router.push("/orders");
        return;
      }
      lastError = insertError.message;
    }

    setOrderMessage(`Unable to place order: ${lastError}`);
    setOrderStatus("Draft");
    setOrderLoading(false);
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const productPhotoById = new Map(
    productGroups
      .flatMap((group) => group.items)
      .map((product) => [product.id, product.photoUrl ?? null] as const)
  );

  const scrollToProducts = () => {
    const section = document.getElementById("products");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const animateBackToTop = () => {
    const startY = window.scrollY;
    if (startY <= 0) return;
    const duration = 650;
    const startTime = performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      window.scrollTo(0, Math.round(startY * (1 - eased)));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  };

  const handleHomeClick = () => {
    setActiveTab("catalog");
    scrollToProducts();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50/50 text-slate-800">
      <Navbar
        hideAuthButtons
        homeHref="/home"
        categoryLinks={(productGroups.length > 0
          ? productGroups.map((group) => group.category)
          : [...CLIENT_CATEGORY_LABELS]
        ).map((category) => ({
          label: category,
          href: `/category/${categoryToSlug(category)}`,
        }))}
        profileHref="/profile"
        orderHistoryHref="/orders"
        userName={loading ? "User" : displayName ?? "User"}
        onHomeClick={handleHomeClick}
        onLogoutClick={handleLogout}
      />

      <AnimatePresence>
        {addOrderAlert ? (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-none fixed inset-x-4 top-20 z-50 sm:inset-x-auto sm:right-6 sm:top-6"
          >
            <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 shadow-xl shadow-emerald-500/30 ring-1 ring-white/25">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                <BadgeCheck className="size-4 text-white" aria-hidden={true} />
              </span>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-white">
                  {addOrderAlert}
                </p>
                <p className="mt-0.5 text-xs text-white/80">
                  Check your order status in “View Orders”.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="relative mx-auto w-full max-w-6xl px-4 pt-4 pb-16 sm:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />
        </div>

        {error ? (
          <p className="mb-8 max-w-xl rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <motion.section
          id="products"
          className="mt-4 space-y-10 scroll-mt-24"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex w-full max-w-full flex-wrap rounded-full border border-sky-200 bg-white p-1 text-xs font-medium shadow-sm sm:inline-flex sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab("catalog");
                scrollToProducts();
              }}
              className={`min-h-14 flex-1 rounded-full px-6 py-4 transition sm:min-h-10 sm:px-4 sm:py-2 sm:flex-none ${
                activeTab === "catalog"
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                  : "text-slate-600 hover:text-sky-600"
              }`}
            >
              Product Catalog
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("view-order");
                scrollToProducts();
              }}
              className={`min-h-14 flex-1 rounded-full px-6 py-4 transition sm:min-h-10 sm:px-4 sm:py-2 sm:flex-none ${
                activeTab === "view-order"
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                  : "text-slate-600 hover:text-sky-600"
              }`}
            >
              View Cart
            </button>
          </div>

          {activeTab === "view-order" ? (
            <div className="space-y-4 rounded-3xl border border-sky-100 bg-white p-6 shadow-md shadow-sky-500/5 sm:mr-auto sm:max-w-4xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Your Cart</h3>
                  <p className="text-sm text-slate-600">
                    Review selected products before you check out.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  Status: {orderStatus}
                </span>
              </div>
              {cart.length === 0 ? (
                <p className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
                  No items yet. Add products from the Product Catalog tab.
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.key}
                      className="flex w-full flex-wrap items-start justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/30 p-3 sm:flex-nowrap"
                    >
                      <div className="flex w-full min-w-0 items-start gap-3 sm:gap-4">
                        {(item.photoUrl ?? productPhotoById.get(item.productId)) ? (
                          <img
                            src={(item.photoUrl ?? productPhotoById.get(item.productId)) || ""}
                            alt={`${item.name} product photo`}
                            className="h-44 w-40 shrink-0 rounded-xl border border-sky-100 bg-white object-contain sm:h-28 sm:w-44 sm:bg-sky-50 sm:object-cover"
                          />
                        ) : (
                          <div className="flex h-44 w-40 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-white text-sky-600 sm:h-28 sm:w-44">
                            <Droplets className="size-5" aria-hidden={true} />
                          </div>
                        )}
                        <div className="min-w-0 self-center text-center sm:text-left">
                          <p className="text-[11px] uppercase tracking-wide text-sky-600">
                            {item.category || "Product"}
                          </p>
                          <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-500">{formatSizeLabel(item.size)}</p>
                          <p className="text-xs text-slate-500">
                            {item.unitType === "bottle"
                              ? getPrimaryUnitLabel(item.category)
                              : "Case"}{" "}
                            • {formatPeso(item.unitPrice)} each
                          </p>
                        </div>
                      </div>
                      <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:shrink-0 sm:self-center">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-600 hover:bg-sky-50 sm:h-8 sm:w-8"
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-600 hover:bg-sky-50 sm:h-8 sm:w-8"
                        >
                          +
                        </button>
                      </div>
                      <div className="w-full text-sm font-semibold text-slate-800 sm:w-auto sm:shrink-0 sm:self-center sm:text-right">
                        {formatPeso(item.unitPrice * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-sky-600">
                    Estimated total
                  </p>
                  <p className="text-xl font-semibold text-slate-800">
                    {formatPeso(cartTotal)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={orderLoading || cart.length === 0}
                  onClick={() => void placeOrder()}
                  className="inline-flex h-14 w-full items-center justify-center rounded-full bg-sky-500 px-6 text-base font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:text-xs sm:w-auto"
                >
                  {orderLoading ? "Placing order..." : "Place order"}
                </button>
              </div>

              {orderMessage ? (
                <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                  {orderMessage}
                </p>
              ) : null}
            </div>
          ) : (
            <>
            <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100/60 p-6 shadow-lg shadow-sky-500/15 sm:p-8">
              <div className="pointer-events-none absolute -top-20 -right-12 h-56 w-56 rounded-full bg-cyan-200/50 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-14 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.65),transparent_42%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.45),transparent_48%)]" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/85 px-3 py-1 text-xs font-semibold text-cyan-700 shadow-sm">
                  <Droplets className="size-3.5" aria-hidden={true} />
                  Sip Water
                </span>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Welcome to your hydration hub
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">
                  Discover premium drinks and snacks curated for fast ordering. Use the
                  category links in the navbar to explore each collection.
                </p>
              </div>

              <div className="relative mt-6 flex flex-wrap gap-2">
                {(productGroups.length > 0 ? productGroups.map((group) => group.category) : [
                  ...CLIENT_CATEGORY_LABELS,
                ]).map((category) => (
                  <a
                    id={`client-category-${categoryToSlug(category)}`}
                    key={category}
                    href={`/category/${categoryToSlug(category)}`}
                    className="rounded-full border border-cyan-200 bg-white/85 px-4 py-2 text-xs font-semibold text-cyan-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-white"
                  >
                    {category}
                  </a>
                ))}
              </div>
            </section>
            {productsLoading ? (
              <p className="text-sm text-slate-600">Loading products...</p>
            ) : productGroups.length === 0 ? (
              <p className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
                No products available.
              </p>
            ) : null}
            </>
          )}
        </motion.section>

      </main>

      {showBackToTop ? (
        <motion.button
          type="button"
          onClick={animateBackToTop}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.88, rotate: -12 }}
          transition={{ type: "spring", stiffness: 420, damping: 20 }}
          className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-xl font-bold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600 sm:bottom-6 sm:right-6"
          aria-label="Back to top"
        >
          ↑
        </motion.button>
      ) : null}
    </div>
  );
}

