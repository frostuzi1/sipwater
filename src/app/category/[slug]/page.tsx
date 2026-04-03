"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Droplets, Leaf, ShieldCheck, Trash2 } from "lucide-react";

import { Navbar } from "@/components/navbar";
import {
  getCarbonatedSubcategory,
  getPurifiedWaterSubcategory,
  getSnacksSubcategory,
  getYoghurtSubcategory,
  sortCatalogProductsInCategory,
} from "@/lib/catalog-product-order";
import { LANDING_CATEGORY_NAV, getLandingCategoryLabel } from "@/lib/landing-categories";
import { trackClientEvent } from "@/lib/analytics-client";
import { setFlashMessage } from "@/lib/flash-message";
import { getSupabaseClient } from "@/lib/supabase";

type ProductCard = {
  id: string;
  category: string;
  name: string;
  size: string;
  pack: string;
  bottlePrice: number;
  casePrice: number;
  note?: string;
  icon: React.ReactNode;
  photoUrl?: string;
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  size: string;
  pack: string;
  bottle_price: number;
  case_price: number;
  note: string | null;
  photo_url: string | null;
};

type CartItem = {
  key: string;
  productId: string;
  category: string;
  name: string;
  size: string;
  pack: string;
  unitType: "bottle" | "case";
  unitPrice: number;
  quantity: number;
  photoUrl?: string;
};

const CATEGORY_LABELS = LANDING_CATEGORY_NAV;

const formatPeso = (amount: number) =>
  `₱${Number(amount ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const categoryToSlug = (category: string) =>
  category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const formatSizeLabel = (size: string) =>
  size.replace(/\bml\b/gi, "mL").replace(/\bl\b/g, "L");
const formatPackLabel = (pack: string, category: string) => {
  const qty = String(pack).match(/\d+/)?.[0];
  if (!qty) return pack;
  return category === "Snacks" ? `${qty} packs/case` : `${qty} bottles/case`;
};

const getIconForCategory = (category: string) => {
  const value = category.toLowerCase();
  if (value.includes("electrolyte") || value.includes("prebiotic")) {
    return <BadgeCheck className="size-5" aria-hidden={true} />;
  }
  if (value.includes("yoghurt") || value.includes("yogurt") || value.includes("deedo")) {
    return <Leaf className="size-5" aria-hidden={true} />;
  }
  if (value.includes("kaman") || value.includes("snacks") || value.includes("egg")) {
    return <ShieldCheck className="size-5" aria-hidden={true} />;
  }
  return <Droplets className="size-5" aria-hidden={true} />;
};

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "");
  const currentCategory =
    CATEGORY_LABELS.find((label) => categoryToSlug(label) === slug) ?? null;
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"catalog" | "view-cart">("catalog");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [orderStatus, setOrderStatus] = useState<
    "Draft" | "Submitting" | "Pending Confirmation"
  >("Draft");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [addOrderAlert, setAddOrderAlert] = useState<string | null>(null);
  const addOrderAlertTimeoutRef = useRef<number | null>(null);
  const [recentlyClickedActionKey, setRecentlyClickedActionKey] = useState<string | null>(null);
  const clickedActionTimeoutRef = useRef<number | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogSort, setCatalogSort] = useState<
    "default" | "price-asc" | "price-desc"
  >("default");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const cartStorageKey = userId ? `sip_cart_${userId}` : null;

  useEffect(() => {
    const loadSession = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ?? null;
      setUserId(user.id);
      setDisplayName(fullName ?? user.email ?? "User");
      setIsAuthenticated(true);
    };
    void loadSession();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const loadProfile = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from("profiles")
        .select("address, phone, contact_number")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        const row = data as {
          address?: string | null;
          phone?: string | null;
          contact_number?: string | null;
        };
        setDeliveryAddress(row.address?.trim() ?? "");
        setDeliveryPhone(
          (row.phone ?? row.contact_number ?? "").replace(/\D/g, "").slice(0, 11)
        );
      }
    };
    void loadProfile();
  }, [userId]);

  useEffect(() => {
    if (!currentCategory || loading) return;
    trackClientEvent("view_category", {
      category: currentCategory,
      slug,
    });
  }, [currentCategory, loading, slug]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "view-cart") {
      trackClientEvent("view_cart", { category: currentCategory ?? "", slug });
    }
  }, [isAuthenticated, activeTab, currentCategory, slug]);

  useEffect(() => {
    if (!cartStorageKey) {
      setCartHydrated(false);
      return;
    }
    try {
      const raw = window.localStorage.getItem(cartStorageKey);
      if (!raw) {
        setCart([]);
      } else {
        const parsed = JSON.parse(raw) as CartItem[];
        if (!Array.isArray(parsed)) {
          setCart([]);
        } else {
          setCart(
            parsed.filter(
              (item) =>
                item &&
                typeof item.key === "string" &&
                typeof item.productId === "string" &&
                Number(item.quantity ?? 0) > 0
            )
          );
        }
      }
    } catch {
      setCart([]);
    } finally {
      setCartHydrated(true);
    }
  }, [cartStorageKey]);

  useEffect(() => {
    if (!cartStorageKey || !cartHydrated) return;
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart, cartStorageKey, cartHydrated]);

  useEffect(() => {
    const loadProducts = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentCategory) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("products")
        .select("id, name, category, size, pack, bottle_price, case_price, note, photo_url")
        .order("name", { ascending: true });

      const rows = (data ?? []) as ProductRow[];
      const mapped = sortCatalogProductsInCategory(
        currentCategory,
        rows
          .filter((row) => getLandingCategoryLabel(row.category, row.name) === currentCategory)
          .map((row) => ({
            id: row.id,
            category: row.category,
            name: row.name,
            size: row.size,
            pack: row.pack,
            bottlePrice: Number(row.bottle_price ?? 0),
            casePrice: Number(row.case_price ?? 0),
            note: row.note ?? undefined,
            icon: getIconForCategory(row.category),
            photoUrl: row.photo_url ?? undefined,
          }))
      );

      setProducts(mapped);
      setLoading(false);
    };

    void loadProducts();
  }, [currentCategory]);

  const addToCart = (item: ProductCard, unitType: "bottle" | "case") => {
    if (!isAuthenticated) {
      router.push("/?auth=login");
      return;
    }
    setOrderMessage(null);
    setOrderStatus("Draft");
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
          unitType,
          unitPrice: unitType === "bottle" ? item.bottlePrice : item.casePrice,
          quantity: 1,
          photoUrl: item.photoUrl,
        },
      ];
    });
    const primaryLabel = currentCategory === "Snacks" ? "Pack" : "Bottle";
    const actionLabel = unitType === "case" ? "Case" : primaryLabel;
    setAddOrderAlert(`${actionLabel} added to cart: ${item.name}.`);
    const actionKey = `${item.id}-${unitType}`;
    setRecentlyClickedActionKey(actionKey);
    trackClientEvent("add_to_cart", {
      productId: item.id,
      name: item.name,
      unitType,
      category: currentCategory ?? "",
      slug,
    });
    if (addOrderAlertTimeoutRef.current) {
      window.clearTimeout(addOrderAlertTimeoutRef.current);
    }
    if (clickedActionTimeoutRef.current) {
      window.clearTimeout(clickedActionTimeoutRef.current);
    }
    addOrderAlertTimeoutRef.current = window.setTimeout(() => {
      setAddOrderAlert(null);
    }, 2000);
    clickedActionTimeoutRef.current = window.setTimeout(() => {
      setRecentlyClickedActionKey(null);
    }, 260);
  };

  useEffect(() => {
    return () => {
      if (addOrderAlertTimeoutRef.current) {
        window.clearTimeout(addOrderAlertTimeoutRef.current);
      }
      if (clickedActionTimeoutRef.current) {
        window.clearTimeout(clickedActionTimeoutRef.current);
      }
    };
  }, []);

  const updateQuantity = (key: string, nextQuantity: number) => {
    setOrderStatus("Draft");
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, quantity: Math.max(1, nextQuantity) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (key: string) => {
    setOrderStatus("Draft");
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const placeOrder = async () => {
    if (!cart.length || !userId) return;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setOrderMessage("Unable to place order right now.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setOrderMessage("Please sign in again to place your order.");
      return;
    }

    setOrderLoading(true);
    setOrderStatus("Submitting");
    setOrderMessage(null);
    const totalPrice = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const idempotency_key = crypto.randomUUID();
    const items = cart.map((item) => ({
      product_id: item.productId,
      name: item.name,
      size: item.size,
      pack: item.pack,
      unit_type: item.unitType,
      unit_price: item.unitPrice,
      quantity: item.quantity,
    }));

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idempotency_key,
          total_price: totalPrice,
          items,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        orderId?: string;
        duplicate?: boolean;
      };

      if (!res.ok || !json.ok) {
        setOrderLoading(false);
        setOrderStatus("Draft");
        setOrderMessage(json.error ?? "Unable to place order.");
        return;
      }

      setCart([]);
      setOrderStatus("Pending Confirmation");
      setOrderLoading(false);
      trackClientEvent("checkout_complete", {
        category: currentCategory ?? "",
        orderId: json.orderId,
        duplicate: Boolean(json.duplicate),
      });
      setFlashMessage(
        json.duplicate
          ? "That order was already submitted."
          : "Order placed successfully."
      );
      router.push("/orders");
    } catch (e) {
      setOrderLoading(false);
      setOrderStatus("Draft");
      setOrderMessage(
        e instanceof Error ? e.message : "Network error placing order."
      );
    }
  };

  const catalogFilteredProducts = useMemo(() => {
    let list = [...products];
    const q = catalogQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.size.toLowerCase().includes(q) ||
          Boolean(p.note && p.note.toLowerCase().includes(q))
      );
    }
    const minUnit = (p: ProductCard) => Math.min(p.bottlePrice, p.casePrice);
    if (catalogSort === "price-asc") {
      list.sort((a, b) => minUnit(a) - minUnit(b));
    } else if (catalogSort === "price-desc") {
      list.sort((a, b) => minUnit(b) - minUnit(a));
    }
    return list;
  }, [products, catalogQuery, catalogSort]);

  const purifiedWaterSections = useMemo(() => {
    if (currentCategory !== "Purified Water") return null;
    const drinking = catalogFilteredProducts.filter(
      (p) => getPurifiedWaterSubcategory(p.name, p.size) === "purified-drinking-water"
    );
    const sipPlus = catalogFilteredProducts.filter(
      (p) => getPurifiedWaterSubcategory(p.name, p.size) === "sip-plus-electrolyte"
    );
    return [
      {
        key: "purified-drinking-water" as const,
        title: "Purified Drinking Water",
        items: drinking,
      },
      {
        key: "sip-plus-electrolyte" as const,
        title: "SIP Plus Electrolyte Drinks",
        items: sipPlus,
      },
    ].filter((s) => s.items.length > 0);
  }, [currentCategory, catalogFilteredProducts]);

  const yoghurtSections = useMemo(() => {
    if (currentCategory !== "Yoghurt Drinks") return null;
    const yobick = catalogFilteredProducts.filter(
      (p) => getYoghurtSubcategory(p.name, p.size) === "yobick-yoghurt-drink"
    );
    const deedo = catalogFilteredProducts.filter(
      (p) => getYoghurtSubcategory(p.name, p.size) === "deedo-juice-with-yoghurt"
    );
    return [
      {
        key: "yobick-yoghurt-drink" as const,
        title: "Yobick Yoghurt Drink",
        items: yobick,
      },
      {
        key: "deedo-juice-with-yoghurt" as const,
        title: "Deedo Juice with Yoghurt",
        items: deedo,
      },
    ].filter((s) => s.items.length > 0);
  }, [currentCategory, catalogFilteredProducts]);

  const carbonatedSections = useMemo(() => {
    if (currentCategory !== "Carbonated Drinks") return null;
    const vida = catalogFilteredProducts.filter(
      (p) => getCarbonatedSubcategory(p.name, p.size) === "vida-zero-sparkling"
    );
    const nutrifizz = catalogFilteredProducts.filter(
      (p) => getCarbonatedSubcategory(p.name, p.size) === "nutrifizz-prebiotic"
    );
    return [
      {
        key: "vida-zero-sparkling" as const,
        title: "Vida Zero Sparkling Drinks",
        items: vida,
      },
      {
        key: "nutrifizz-prebiotic" as const,
        title: "Nutrifizz Prebiotic Soda Drinks",
        items: nutrifizz,
      },
    ].filter((s) => s.items.length > 0);
  }, [currentCategory, catalogFilteredProducts]);

  const snacksSections = useMemo(() => {
    if (currentCategory !== "Snacks") return null;
    const kaman = catalogFilteredProducts.filter(
      (p) => getSnacksSubcategory(p.name, p.size) === "kaman"
    );
    return [
      {
        key: "kaman" as const,
        title: "Kaman",
        items: kaman,
      },
    ].filter((s) => s.items.length > 0);
  }, [currentCategory, catalogFilteredProducts]);

  const renderCatalogProductCard = (p: ProductCard, animIndex: number) => (
    <motion.article
      key={`${currentCategory}-${p.id}-${p.name}-${p.size}`}
      className="group rounded-3xl border border-sky-100 bg-white p-6 shadow-md shadow-sky-500/5 transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-500/10"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }}
      transition={{ duration: 0.35, delay: animIndex * 0.05 }}
    >
      {p.photoUrl ? (
        <img
          src={p.photoUrl}
          alt={`${p.name} product photo`}
          className="h-[24rem] w-full rounded-2xl border border-sky-100 object-[center_45%] object-cover"
        />
      ) : (
        <div className="flex items-center justify-between">
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            {p.icon}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {formatPackLabel(p.pack, currentCategory ?? "")}
          </span>
        </div>
      )}

      {p.photoUrl ? (
        <div className="mt-3 flex justify-end">
          <span className="text-xs font-medium text-slate-500">
            {formatPackLabel(p.pack, currentCategory ?? "")}
          </span>
        </div>
      ) : null}

      <h4 className="mt-4 text-base font-semibold text-slate-800">{p.name}</h4>
      <p className="mt-1 text-xs text-slate-500">{formatSizeLabel(p.size)}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
        <div className="space-y-1">
          <dt className="text-[11px] uppercase tracking-wide text-sky-600">
            {currentCategory === "Snacks" ? "Pack" : "Bottle"}
          </dt>
          <dd className="font-semibold text-slate-800">{formatPeso(p.bottlePrice)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-[11px] uppercase tracking-wide text-sky-600">Case</dt>
          <dd className="font-semibold text-slate-800">{formatPeso(p.casePrice)}</dd>
        </div>
      </dl>

      {p.note ? (
        <p className="mt-2 text-[11px] text-slate-500">
          {currentCategory === "Snacks" ? "₱10.00 each" : p.note}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <motion.button
          type="button"
          onClick={() => addToCart(p, "bottle")}
          whileTap={{ scale: 0.95 }}
          animate={
            recentlyClickedActionKey === `${p.id}-bottle`
              ? { scale: [1, 0.95, 1.02, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.26, ease: "easeOut" }}
          className={`inline-flex h-10 flex-1 items-center justify-center rounded-full px-4 text-xs font-semibold text-white shadow-lg transition ${
            recentlyClickedActionKey === `${p.id}-bottle`
              ? "bg-sky-600 shadow-sky-500/40 ring-2 ring-sky-200"
              : "bg-sky-500 shadow-sky-500/30 hover:bg-sky-600"
          }`}
        >
          {currentCategory === "Snacks" ? "Add Pack" : "Add Bottle"}
        </motion.button>
        <motion.button
          type="button"
          onClick={() => addToCart(p, "case")}
          whileTap={{ scale: 0.95 }}
          animate={
            recentlyClickedActionKey === `${p.id}-case`
              ? { scale: [1, 0.95, 1.02, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.26, ease: "easeOut" }}
          className={`inline-flex h-10 flex-1 items-center justify-center rounded-full border-2 px-4 text-xs font-semibold transition ${
            recentlyClickedActionKey === `${p.id}-case`
              ? "border-sky-300 bg-sky-100 text-sky-700 ring-2 ring-sky-200"
              : "border-sky-200 bg-white text-sky-600 hover:bg-sky-50"
          }`}
        >
          Add Case
        </motion.button>
      </div>
    </motion.article>
  );

  if (!currentCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50/50 text-slate-800">
        <Navbar
          hideAuthButtons={isAuthenticated}
          homeHref={isAuthenticated ? "/category/purified-water" : "/"}
          categoryLinks={CATEGORY_LABELS.map((label) => ({
            label,
            href: `/category/${categoryToSlug(label)}`,
          }))}
          profileHref={isAuthenticated ? "/profile" : undefined}
          orderHistoryHref={isAuthenticated ? "/orders" : undefined}
          userName={displayName ?? "User"}
          onLogoutClick={
            isAuthenticated
              ? () => {
                  void (async () => {
                    const supabase = getSupabaseClient();
                    if (!supabase) {
                      router.replace("/");
                      return;
                    }
                    await supabase.auth.signOut();
                    router.replace("/");
                  })();
                }
              : undefined
          }
          onLoginClick={() => router.push("/?auth=login")}
          onSignupClick={() => router.push("/?auth=signup")}
        />
        <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Category not found.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-sky-700">
            Back to main landing
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50/50 text-slate-800">
      <Navbar
        hideAuthButtons={isAuthenticated}
        homeHref={isAuthenticated ? "/category/purified-water" : "/"}
        categoryLinks={CATEGORY_LABELS.map((label) => ({
          label,
          href: `/category/${categoryToSlug(label)}`,
        }))}
        profileHref={isAuthenticated ? "/profile" : undefined}
        orderHistoryHref={isAuthenticated ? "/orders" : undefined}
        userName={displayName ?? "User"}
        onLogoutClick={
          isAuthenticated
            ? () => {
                void (async () => {
                  const supabase = getSupabaseClient();
                  if (!supabase) {
                    router.replace("/");
                    return;
                  }
                  await supabase.auth.signOut();
                  router.replace("/");
                })();
              }
            : undefined
        }
        onLoginClick={() => router.push("/?auth=login")}
        onSignupClick={() => router.push("/?auth=signup")}
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
            <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 shadow-xl shadow-emerald-500/30 ring-1 ring-white/25">
              <p className="text-sm font-semibold text-white">{addOrderAlert}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <main className="relative mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6">
        {isAuthenticated ? (
          <div className="inline-flex w-full max-w-full flex-wrap rounded-full border border-sky-200 bg-white p-1 text-xs font-medium shadow-sm sm:inline-flex sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`min-h-12 flex-1 rounded-full px-5 py-3 transition sm:min-h-10 sm:px-4 sm:py-2 sm:flex-none ${
                activeTab === "catalog"
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                  : "text-slate-600 hover:text-sky-600"
              }`}
            >
              Product Catalog
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("view-cart")}
              className={`min-h-12 flex-1 rounded-full px-5 py-3 transition sm:min-h-10 sm:px-4 sm:py-2 sm:flex-none ${
                activeTab === "view-cart"
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                  : "text-slate-600 hover:text-sky-600"
              }`}
            >
              View Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </button>
          </div>
        ) : null}

        {activeTab === "catalog" ? (
          <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100/60 p-6 shadow-lg shadow-sky-500/15 sm:p-8">
            <div className="pointer-events-none absolute -top-20 -right-12 h-56 w-56 rounded-full bg-cyan-200/50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-14 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.65),transparent_42%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.45),transparent_48%)]" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/85 px-3 py-1 text-xs font-semibold text-cyan-700 shadow-sm">
                <Droplets className="size-3.5" aria-hidden={true} />
                Sip Water
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Welcome to your hydration hub
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">
                Discover premium drinks and snacks curated for fast ordering. Use the category
                links in the navbar to explore each collection.
              </p>
            </div>

            <div className="relative mt-6 flex flex-wrap gap-2">
              {CATEGORY_LABELS.map((label) => (
                <Link
                  key={label}
                  href={`/category/${categoryToSlug(label)}`}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 ${
                    label === currentCategory
                      ? "border-cyan-400 bg-cyan-500 text-white"
                      : "border-cyan-200 bg-white/85 text-cyan-700 hover:border-cyan-300 hover:bg-white"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="relative mt-6 flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="search"
                placeholder="Search products in this category…"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                className="h-11 w-full rounded-full border border-cyan-200/80 bg-white/90 px-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-400"
                aria-label="Search products"
              />
              <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600 sm:min-w-[11rem]">
                <span className="hidden sm:inline">Sort</span>
                <select
                  value={catalogSort}
                  onChange={(e) =>
                    setCatalogSort(
                      e.target.value as "default" | "price-asc" | "price-desc"
                    )
                  }
                  className="h-11 w-full rounded-full border border-cyan-200/80 bg-white/90 px-3 text-sm text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-cyan-400 sm:w-auto"
                >
                  <option value="default">Catalog order</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>
            </div>
          </section>
        ) : null}

        {loading ? (
          <p className="mt-8 text-sm text-slate-600">Loading products...</p>
        ) : activeTab === "view-cart" ? (
          <div className="mt-8 space-y-4 rounded-3xl border border-sky-100 bg-white p-6 shadow-md shadow-sky-500/5 sm:mr-auto sm:max-w-4xl">
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
            {deliveryAddress || deliveryPhone ? (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Saved delivery details
                </p>
                {deliveryPhone ? (
                  <p className="mt-1">
                    <span className="text-slate-500">Contact:</span>{" "}
                    <span className="font-medium text-slate-800">{deliveryPhone}</span>
                  </p>
                ) : null}
                {deliveryAddress ? (
                  <p className="mt-1">
                    <span className="text-slate-500">Address:</span>{" "}
                    <span className="font-medium text-slate-800">{deliveryAddress}</span>
                  </p>
                ) : null}
                <Link
                  href="/profile"
                  className="mt-2 inline-block text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
                >
                  Edit in profile
                </Link>
              </div>
            ) : isAuthenticated ? (
              <p className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                Add your{" "}
                <Link href="/profile" className="font-semibold text-amber-950 underline">
                  delivery address and contact
                </Link>{" "}
                in your profile to reduce mistakes on repeat orders.
              </p>
            ) : null}
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
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
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
                          {item.category || currentCategory}
                        </p>
                        <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{formatSizeLabel(item.size)}</p>
                        <p className="text-xs text-slate-500">
                          {item.unitType === "case"
                            ? "Case"
                            : currentCategory === "Snacks"
                              ? "Pack"
                              : "Bottle"}{" "}
                          • {formatPeso(item.unitPrice)} each
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:shrink-0 sm:self-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
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
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.key)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 sm:py-1"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 className="size-3.5 shrink-0" aria-hidden={true} />
                        Remove
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
                <p className="text-xs uppercase tracking-wide text-sky-600">Estimated total</p>
                <p className="text-xl font-semibold text-slate-800">
                  {formatPeso(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}
                </p>
              </div>
              <button
                type="button"
                disabled={orderLoading || cart.length === 0}
                onClick={() => void placeOrder()}
                className="inline-flex h-14 w-full items-center justify-center rounded-full bg-sky-500 px-6 text-base font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto sm:text-xs"
              >
                {orderLoading ? "Placing order..." : "Place order"}
              </button>
            </div>
            {orderMessage ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {orderMessage}
              </p>
            ) : null}
          </div>
        ) : products.length === 0 ? (
          <p className="mt-8 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
            No products available in this category.
          </p>
        ) : catalogFilteredProducts.length === 0 ? (
          <p className="mt-8 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
            No products match your search.{" "}
            <button
              type="button"
              onClick={() => {
                setCatalogQuery("");
                setCatalogSort("default");
              }}
              className="font-semibold text-sky-700 underline"
            >
              Clear filters
            </button>
          </p>
        ) : purifiedWaterSections && purifiedWaterSections.length > 0 ? (
          <div className="mt-8 space-y-14">
            {purifiedWaterSections.map((section, si) => (
              <section
                key={section.key}
                className="space-y-1"
                aria-labelledby={`pw-section-${section.key}`}
              >
                <div className="border-b border-sky-100/80 pb-2">
                  <h2
                    id={`pw-section-${section.key}`}
                    className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
                  >
                    {section.title}
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((p, i) =>
                    renderCatalogProductCard(p, si * 20 + i)
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : yoghurtSections && yoghurtSections.length > 0 ? (
          <div className="mt-8 space-y-14">
            {yoghurtSections.map((section, si) => (
              <section
                key={section.key}
                className="space-y-1"
                aria-labelledby={`yg-section-${section.key}`}
              >
                <div className="border-b border-sky-100/80 pb-2">
                  <h2
                    id={`yg-section-${section.key}`}
                    className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
                  >
                    {section.title}
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((p, i) =>
                    renderCatalogProductCard(p, si * 20 + i)
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : carbonatedSections && carbonatedSections.length > 0 ? (
          <div className="mt-8 space-y-14">
            {carbonatedSections.map((section, si) => (
              <section
                key={section.key}
                className="space-y-1"
                aria-labelledby={`cd-section-${section.key}`}
              >
                <div className="border-b border-sky-100/80 pb-2">
                  <h2
                    id={`cd-section-${section.key}`}
                    className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
                  >
                    {section.title}
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((p, i) =>
                    renderCatalogProductCard(p, si * 20 + i)
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : snacksSections && snacksSections.length > 0 ? (
          <div className="mt-8 space-y-14">
            {snacksSections.map((section, si) => (
              <section
                key={section.key}
                className="space-y-1"
                aria-labelledby={`sn-section-${section.key}`}
              >
                <div className="border-b border-sky-100/80 pb-2">
                  <h2
                    id={`sn-section-${section.key}`}
                    className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
                  >
                    {section.title}
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((p, i) =>
                    renderCatalogProductCard(p, si * 20 + i)
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => renderCatalogProductCard(p, i))}
          </div>
        )}
      </main>
    </div>
  );
}

