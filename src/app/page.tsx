 "use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { BadgeCheck, Droplets, Leaf, ShieldCheck, Truck } from "lucide-react";

import { Navbar } from "@/components/navbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { isAdminEmail } from "@/lib/admin";
import { setFlashMessage } from "@/lib/flash-message";
import { getSupabaseClient } from "@/lib/supabase";

type Product = {
  name: string;
  size: string;
  pack: string;
  bottlePrice: string;
  casePrice: string;
  note?: string;
  icon: React.ReactNode;
  photoUrl?: string;
};

type ProductGroup = {
  category: string;
  items: Product[];
};

type ProductRow = {
  name: string;
  category: string;
  size: string;
  pack: string;
  bottle_price: number;
  case_price: number;
  note: string | null;
  photo_url: string | null;
};

const fallbackProductGroups: ProductGroup[] = [
  {
    category: "Purified Drinking Water",
    items: [
      {
        name: "SIP Purified Water",
        size: "350 ml",
        pack: "24 / case",
        bottlePrice: "₱7",
        casePrice: "₱168",
        icon: <Droplets className="size-5" aria-hidden={true} />,
      },
      {
        name: "SIP Purified Water",
        size: "500 ml",
        pack: "24 / case",
        bottlePrice: "₱9",
        casePrice: "₱216",
        icon: <Droplets className="size-5" aria-hidden={true} />,
      },
      {
        name: "SIP Purified Water",
        size: "1000 ml",
        pack: "12 / case",
        bottlePrice: "₱15",
        casePrice: "₱180",
        icon: <Droplets className="size-5" aria-hidden={true} />,
      },
    ],
  },
  {
    category: "SIP Plus Electrolyte Drinks",
    items: [
      {
        name: "Original Grapefruit Sugar Free",
        size: "350 ml",
        pack: "12 / case",
        bottlePrice: "₱30",
        casePrice: "₱360",
        icon: <BadgeCheck className="size-5" aria-hidden={true} />,
      },
      {
        name: "Honey Yuzo Sugar Free Electrolytes",
        size: "350 ml",
        pack: "12 / case",
        bottlePrice: "₱30",
        casePrice: "₱360",
        icon: <BadgeCheck className="size-5" aria-hidden={true} />,
      },
    ],
  },
  {
    category: "Vida Zero Sparkling Drinks",
    items: [
      {
        name: "Salt Lychee",
        size: "325 ml",
        pack: "24 / case",
        bottlePrice: "₱42",
        casePrice: "₱1,008",
        icon: <Droplets className="size-5" aria-hidden={true} />,
      },
      {
        name: "Original Citrus",
        size: "325 ml",
        pack: "24 / case",
        bottlePrice: "₱42",
        casePrice: "₱1,008",
        icon: <Droplets className="size-5" aria-hidden={true} />,
      },
      {
        name: "Lemon",
        size: "325 ml",
        pack: "24 / case",
        bottlePrice: "₱42",
        casePrice: "₱1,008",
        icon: <Droplets className="size-5" aria-hidden={true} />,
      },
    ],
  },
  {
    category: "Yobick Yoghurt Drink",
    items: [
      {
        name: "Original",
        size: "310 ml",
        pack: "24 / case",
        bottlePrice: "₱42",
        casePrice: "₱1,008",
        icon: <Leaf className="size-5" aria-hidden={true} />,
      },
    ],
  },
  {
    category: "Deedo Juice with Yogurt",
    items: [
      {
        name: "Grape Juice (10×6)",
        size: "115 ml",
        pack: "10 / case",
        bottlePrice: "₱72",
        casePrice: "₱720",
        note: "₱12.00 each",
        icon: <Leaf className="size-5" aria-hidden={true} />,
      },
      {
        name: "Orange Juice (10×6)",
        size: "115 ml",
        pack: "10 / case",
        bottlePrice: "₱72",
        casePrice: "₱720",
        note: "₱12.00 each",
        icon: <Leaf className="size-5" aria-hidden={true} />,
      },
    ],
  },
  {
    category: "Nutrifizz Prebiotic Soda Drinks",
    items: [
      {
        name: "Lemon Lime Prebiotic",
        size: "330 ml",
        pack: "24 / case",
        bottlePrice: "₱36",
        casePrice: "₱864",
        icon: <BadgeCheck className="size-5" aria-hidden={true} />,
      },
      {
        name: "Yogurt Soda Prebiotic",
        size: "330 ml",
        pack: "24 / case",
        bottlePrice: "₱36",
        casePrice: "₱864",
        icon: <BadgeCheck className="size-5" aria-hidden={true} />,
      },
    ],
  },
  {
    category: "Kaman",
    items: [
      {
        name: "Coconut Ice Cream Egg Roll (12×20)",
        size: "20 g",
        pack: "12 / case",
        bottlePrice: "₱200",
        casePrice: "₱2,400",
        note: "10 / pack",
        icon: <ShieldCheck className="size-5" aria-hidden={true} />,
      },
      {
        name: "Egg Yolk Egg Roll (12×20)",
        size: "20 g",
        pack: "12 / case",
        bottlePrice: "₱200",
        casePrice: "₱2,400",
        note: "10 / pack",
        icon: <ShieldCheck className="size-5" aria-hidden={true} />,
      },
    ],
  },
];

const getIconForCategory = (category: string) => {
  const value = category.toLowerCase();
  if (value.includes("electrolyte") || value.includes("prebiotic")) {
    return <BadgeCheck className="size-5" aria-hidden={true} />;
  }
  if (value.includes("yoghurt") || value.includes("juice")) {
    return <Leaf className="size-5" aria-hidden={true} />;
  }
  if (value.includes("kaman") || value.includes("egg")) {
    return <ShieldCheck className="size-5" aria-hidden={true} />;
  }
  return <Droplets className="size-5" aria-hidden={true} />;
};

const formatPeso = (amount: number) => `₱${amount.toLocaleString()}`;
const parsePeso = (value: string) => Number(value.replace(/[^\d.]/g, "")) || 0;
const formatPackLabel = (pack: string, category: string) => {
  const qty = String(pack).match(/\d+/)?.[0];
  if (!qty) return pack;
  return category === "Kaman" ? `${qty} packs/case` : `${qty} bottles/case`;
};

const landingCategoryOrderMap: Map<string, number> = new Map(
  fallbackProductGroups.map((group, index) => [group.category, index] as const)
);

const landingItemOrderMap: Map<string, number> = new Map(
  fallbackProductGroups.flatMap((group) =>
    group.items.map((item, index) => [
      `${group.category}__${item.name}__${item.size}__${item.pack}`,
      index,
    ] as const)
  )
);

export default function Home() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    contactNumber: "",
    address: "",
  });
  const [catalogGroups, setCatalogGroups] =
    useState<ProductGroup[]>(fallbackProductGroups);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const redirectIfAuthenticated = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        router.replace(isAdminEmail(user.email) ? "/admin" : "/home");
      }
    };

    void redirectIfAuthenticated();
  }, [router]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setCatalogError("Supabase is not configured. Showing fallback catalog.");
      setCatalogLoading(false);
      return;
    }

    const loadCatalog = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "name, category, size, pack, bottle_price, case_price, note, photo_url"
        )
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        setCatalogError("Unable to load live product catalog. Showing fallback list.");
        setCatalogLoading(false);
        return;
      }

      const rows = (data ?? []) as ProductRow[];
      if (rows.length === 0) {
        setCatalogGroups([]);
        setCatalogError(null);
        setCatalogLoading(false);
        return;
      }

      const sortedRows = [...rows].sort((a, b) => {
        const categoryOrderA =
          landingCategoryOrderMap.get(a.category) ?? Number.MAX_SAFE_INTEGER;
        const categoryOrderB =
          landingCategoryOrderMap.get(b.category) ?? Number.MAX_SAFE_INTEGER;
        if (categoryOrderA !== categoryOrderB) {
          return categoryOrderA - categoryOrderB;
        }

        const keyA = `${a.category}__${a.name}__${a.size}__${a.pack}`;
        const keyB = `${b.category}__${b.name}__${b.size}__${b.pack}`;
        const orderA = landingItemOrderMap.get(keyA) ?? Number.MAX_SAFE_INTEGER;
        const orderB = landingItemOrderMap.get(keyB) ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return `${a.category} ${a.name} ${a.size}`.localeCompare(
          `${b.category} ${b.name} ${b.size}`
        );
      });

      const grouped = sortedRows.reduce<Record<string, Product[]>>((acc, row) => {
        const category = row.category ?? "Other Products";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          name: row.name,
          size: row.size,
          pack: row.pack,
          bottlePrice: formatPeso(Number(row.bottle_price ?? 0)),
          casePrice: formatPeso(Number(row.case_price ?? 0)),
          note: row.note ?? undefined,
          icon: getIconForCategory(category),
          photoUrl: row.photo_url ?? undefined,
        });
        return acc;
      }, {});

      const groups = Object.entries(grouped).map(([category, items]) => ({
        category,
        items,
      }));

      setCatalogGroups(groups);
      setCatalogError(null);
      setCatalogLoading(false);
    };

    void loadCatalog();

    const channel = supabase
      .channel("landing-products-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          void loadCatalog();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthSuccess(null);
  };
  const closeAuth = () => {
    setAuthMode(null);
    setAuthError(null);
    setAuthSuccess(null);
    setLoadingAuth(false);
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setLoadingAuth(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthError(
        "Supabase is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
      );
      setLoadingAuth(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });

    if (error) {
      setAuthError(error.message);
      setLoadingAuth(false);
      return;
    }

    if (data.user) {
      const metadata = data.user.user_metadata as
        | {
            full_name?: string;
            address?: string;
            contact_number?: string;
            contact?: string;
          }
        | undefined;

      const fullName = metadata?.full_name ?? "";
      const address = metadata?.address ?? "";
      const contactNumber = metadata?.contact_number ?? metadata?.contact ?? "";

      if (fullName || address || contactNumber) {
        await syncProfile({
          id: data.user.id,
          email: data.user.email ?? null,
          fullName,
          address,
          contactNumber,
        });
      }
    }

    setAuthSuccess("Logged in successfully.");
    setFlashMessage("Logged in successfully.");
    setLoadingAuth(false);
    closeAuth();
    router.push(isAdminEmail(data.user?.email) ? "/admin" : "/home");
  };

  const handleSignupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setLoadingAuth(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthError(
        "Supabase is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
      );
      setLoadingAuth(false);
      return;
    }

    const normalizedContact = signupForm.contactNumber.replace(/\D/g, "");
    if (!/^09\d{9}$/.test(normalizedContact)) {
      setAuthError("Contact number must follow 09XXXXXXXXX format.");
      setLoadingAuth(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: {
          full_name: signupForm.name,
          phone: normalizedContact,
          contact_number: normalizedContact,
          address: signupForm.address,
        },
      },
    });

    if (error) {
      setAuthError(error.message);
      setLoadingAuth(false);
      return;
    }

    if (data.user) {
      const profileSync = await syncProfile({
        id: data.user.id,
        email: data.user.email ?? signupForm.email,
        fullName: signupForm.name,
        address: signupForm.address,
        contactNumber: normalizedContact,
      });

      if (!profileSync.ok) {
        setAuthError(
          `Account created but profile details were not saved: ${profileSync.message}`
        );
        setLoadingAuth(false);
        return;
      }
    }

    if (data.session) {
      setAuthSuccess("Sign up successful.");
      closeAuth();
      router.push(isAdminEmail(data.user?.email) ? "/admin" : "/home");
      return;
    }

    setAuthSuccess(
      "Sign up successful. Please check your email for the confirmation link."
    );
    setLoadingAuth(false);
  };

  const handleViewPlansClick = () => {
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

  const handleAddToOrder = () => {
    // Public landing page requires authentication before creating orders.
    openAuth("login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50/50 text-slate-800">
      <Navbar
        onLoginClick={() => openAuth("login")}
        onSignupClick={() => openAuth("signup")}
      />

      <main className="relative mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />
        </div>

        <motion.section
          className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-sm text-sky-700 shadow-sm backdrop-blur-md">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-sky-500 text-white">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
              </span>
              Official Sip Purified Water Distributor
            </div>

            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-800 sm:text-5xl lg:text-6xl">
              Enterprise‑grade hydration,{" "}
              <span className="bg-gradient-to-r from-sky-500 via-sky-600 to-sky-500 bg-clip-text text-transparent">
                crystal clear.
              </span>
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-8 text-slate-600">
              Sip Water distributes SIP Purified Drinking Water, Vida Zero,
              SIP Plus Electrolyte Drinks, Yobick, Deedo, Nutrifizz, and Kaman
              products—presented in a clean, glass-like experience for your
              catalog.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleViewPlansClick}
                className="inline-flex h-11 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600"
              >
                View plans
              </button>
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="inline-flex h-11 items-center justify-center rounded-full border-2 border-sky-400 bg-white px-6 text-sm font-semibold text-sky-600 hover:bg-sky-50"
              >
                Talk to sales
              </button>
            </div>

            <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
                <dt className="text-xs uppercase tracking-wide text-sky-600">
                  Delivery
                </dt>
                <dd className="mt-1 flex items-center gap-2 font-medium text-slate-800">
                  <Truck className="size-4 text-sky-500" aria-hidden="true" />
                  Route‑optimized
                </dd>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
                <dt className="text-xs uppercase tracking-wide text-sky-600">
                  Purity
                </dt>
                <dd className="mt-1 flex items-center gap-2 font-medium text-slate-800">
                  <Droplets className="size-4 text-sky-500" aria-hidden="true" />
                  7‑stage filtered
                </dd>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
                <dt className="text-xs uppercase tracking-wide text-sky-600">
                  Impact
                </dt>
                <dd className="mt-1 flex items-center gap-2 font-medium text-slate-800">
                  <Leaf className="size-4 text-sky-500" aria-hidden="true" />
                  Premium beverage lineup
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[40px] bg-sky-100/60 blur-3xl" />
            <div className="rounded-[32px] border border-sky-100 bg-white/90 p-6 shadow-xl shadow-sky-500/10 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-3">
                  <span className="inline-flex size-11 items-center justify-center rounded-3xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
                    <Droplets className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                    Sip Purified Water Overview
                    </div>
                    <div className="text-xs text-slate-500">
                      Purified • Mineral-balanced • Ready to deliver
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="max-w-[15rem]">
                      <div className="text-sm font-semibold text-slate-800">
                        Purified water pricing
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        SIP Purified Drinking Water in 350 ml, 500 ml, and
                        1000 ml sizes.
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <span className="text-sm font-semibold text-sky-600 whitespace-nowrap">
                        from ₱7 / bottle
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                    Assorted SIP Beverage Collection
                  </div>
                  <div className="mt-3 grid gap-3 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span>Vida Zero Sparkling Drinks</span>
                      <span className="font-semibold text-sky-600">
                         ₱42 / bottle
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>SIP Plus Electrolyte Drinks</span>
                      <span className="font-semibold text-sky-600">
                         ₱30 / bottle
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Yobick Yoghurt Drink</span>
                      <span className="font-semibold text-sky-600">
                        ₱42 / bottle
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Deedo Juice with Yogurt</span>
                      <span className="font-semibold text-sky-600">
                        ₱72 / pack (₱12 each)
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Nutrifizz Prebiotic Soda</span>
                      <span className="font-semibold text-sky-600">
                        ₱36 / bottle
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Kaman Egg Rolls</span>
                      <span className="font-semibold text-sky-600">
                        ₱200 / pack (10pcs/pack)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-slate-800">
                    Ready to place an order?
                  </div>
                  <div className="text-xs text-slate-600">
                    Use the catalog below to review sizes and pricing, then
                    contact us so we can confirm availability and delivery
                    options for your area.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openAuth("signup")}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-sky-500 px-6 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 whitespace-nowrap"
                >
                  Leave your details
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="products"
          className="mt-20 space-y-10 scroll-mt-24"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-800">
                Product catalog
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                All SIP Water products, from purified drinking water to
                functional sparkling, yoghurt drinks, and more.
              </p>
            </div>
          </div>

          {catalogError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {catalogError}
            </p>
          ) : null}

          {catalogLoading ? (
            <p className="text-sm text-slate-600">Loading products...</p>
          ) : catalogGroups.length === 0 ? (
            <p className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
              No products available yet. Add products from the admin panel.
            </p>
          ) : (
            catalogGroups.map((group) => (
            <div key={group.category} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  {group.category}
                </h3>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((p, i) => (
                  <motion.article
                    key={`${group.category}-${p.name}-${p.size}`}
                    className="group rounded-3xl border border-sky-100 bg-white p-6 shadow-md shadow-sky-500/5 transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-500/10"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-24px" }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
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
                          {formatPackLabel(p.pack, group.category)}
                        </span>
                      </div>
                    )}

                    {p.photoUrl ? (
                      <div className="mt-3 flex justify-end">
                        <span className="text-xs font-medium text-slate-500">
                          {formatPackLabel(p.pack, group.category)}
                        </span>
                      </div>
                    ) : null}

                    <h4 className="mt-4 text-base font-semibold text-slate-800">
                      {p.name}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">{p.size}</p>

                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div className="space-y-1">
                        <dt className="text-[11px] uppercase tracking-wide text-sky-600">
                          {group.category === "Kaman" ? "Pack" : "Bottle"}
                        </dt>
                        <dd className="font-semibold text-slate-800">
                          {p.bottlePrice}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[11px] uppercase tracking-wide text-sky-600">
                          Case
                        </dt>
                        <dd className="font-semibold text-slate-800">
                          {p.casePrice}
                        </dd>
                      </div>
                    </dl>

                    {p.note ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        {p.note}
                      </p>
                    ) : null}

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleAddToOrder}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-sky-500 px-4 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600"
                      >
                        Add to order
                      </button>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
            ))
          )}
        </motion.section>

        <Dialog
          open={authMode !== null}
          onOpenChange={(open: boolean) => !open && closeAuth()}
        >
          <DialogContent className="top-[8vh] !-translate-y-0 max-h-[86vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 sm:p-6 pb-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex self-start rounded-full bg-sky-50 p-1 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className={`px-3 py-1.5 rounded-full transition ${
                      authMode === "login"
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                        : "text-slate-500 hover:text-sky-600"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("signup")}
                    className={`px-3 py-1.5 rounded-full transition ${
                      authMode === "signup"
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                        : "text-slate-500 hover:text-sky-600"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </DialogHeader>

            <div className="min-h-[320px] px-4 sm:px-6 pb-6">
              <AnimatePresence mode="wait">
                {authMode && (
                  <motion.div
                    key={authMode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="mt-2 sm:mt-4"
                  >
                    <DialogTitle className="sr-only">
                      {authMode === "login" ? "Login" : "Sign Up"}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      {authMode === "login"
                        ? "Use your email so we can link inquiries and repeat orders."
                        : "Tell us who you are and what you need so we can follow up."}
                    </DialogDescription>
                    <div className="space-y-1">
                      <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-800">
                        {authMode === "login"
                          ? "Login to manage your orders"
                          : "Create your Sip Water profile"}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        {authMode === "login"
                          ? "Use your email so we can link inquiries and repeat orders."
                          : "Tell us who you are and what you need so we can follow up."}
                      </p>
                    </div>

                    <form
                      className="mt-6 space-y-4"
                      onSubmit={
                        authMode === "login"
                          ? handleLoginSubmit
                          : handleSignupSubmit
                      }
                    >
                    {authMode === "signup" ? (
                      <>
                        <label className="block space-y-2">
                          <span className="text-xs font-medium text-slate-700">Name</span>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={signupForm.name}
                            onChange={(event) =>
                              setSignupForm((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                            className="h-11 w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-3 text-sm text-slate-800 outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400"
                            required
                          />
                        </label>
                        <label className="block space-y-2">
                          <span className="text-xs font-medium text-slate-700">Email</span>
                          <input
                            type="email"
                            placeholder="name@gmail.com"
                            value={signupForm.email}
                            onChange={(event) =>
                              setSignupForm((prev) => ({
                                ...prev,
                                email: event.target.value,
                              }))
                            }
                            className="h-11 w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-3 text-sm text-slate-800 outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400"
                            required
                          />
                        </label>
                        <label className="block space-y-2">
                          <span className="text-xs font-medium text-slate-700">Password</span>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={signupForm.password}
                            onChange={(event) =>
                              setSignupForm((prev) => ({
                                ...prev,
                                password: event.target.value,
                              }))
                            }
                            className="h-11 w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-3 text-sm text-slate-800 outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400"
                            required
                          />
                        </label>
                        <label className="block space-y-2">
                          <span className="text-xs font-medium text-slate-700">Contact Number</span>
                          <input
                            type="tel"
                            placeholder="09XXXXXXXXX"
                            value={signupForm.contactNumber}
                            onChange={(event) =>
                              setSignupForm((prev) => {
                                const digitsOnly = event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 11);
                                return {
                                  ...prev,
                                  contactNumber: digitsOnly,
                                };
                              })
                            }
                            inputMode="numeric"
                            pattern="09[0-9]{9}"
                            maxLength={11}
                            className="h-11 w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-3 text-sm text-slate-800 outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400"
                            required
                          />
                        </label>
                        <label className="block space-y-2">
                          <span className="text-xs font-medium text-slate-700">Address</span>
                          <input
                            type="text"
                            placeholder="Delivery address"
                            value={signupForm.address}
                            onChange={(event) =>
                              setSignupForm((prev) => ({
                                ...prev,
                                address: event.target.value,
                              }))
                            }
                            className="h-11 w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-3 text-sm text-slate-800 outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400"
                            required
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="block space-y-2">
                          <span className="text-xs font-medium text-slate-700">Email</span>
                          <input
                            type="email"
                            placeholder="name@gmail.com"
                            value={loginForm.email}
                            onChange={(event) =>
                              setLoginForm((prev) => ({
                                ...prev,
                                email: event.target.value,
                              }))
                            }
                            className="h-11 w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-3 text-sm text-slate-800 outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400"
                            required
                          />
                        </label>
                        <label className="block space-y-2">
                          <span className="text-xs font-medium text-slate-700">Password</span>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={loginForm.password}
                            onChange={(event) =>
                              setLoginForm((prev) => ({
                                ...prev,
                                password: event.target.value,
                              }))
                            }
                            className="h-11 w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-3 text-sm text-slate-800 outline-none ring-sky-500/40 focus:ring-2 focus:ring-sky-400"
                            required
                          />
                        </label>
                        <p className="text-xs text-slate-600">
                          Don&apos;t have an account?{" "}
                          <button
                            type="button"
                            onClick={() => openAuth("signup")}
                            className="font-semibold text-sky-600 underline underline-offset-2 hover:text-sky-700"
                          >
                            Create now!
                          </button>
                        </p>
                      </>
                    )}

                    {authError ? (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {authError}
                      </p>
                    ) : null}

                    {authSuccess ? (
                      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        {authSuccess}
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={loadingAuth}
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-sky-500 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingAuth
                        ? "Please wait..."
                        : authMode === "login"
                          ? "Continue"
                          : "Sign Up"}
                    </button>
                  </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </DialogContent>
        </Dialog>
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
