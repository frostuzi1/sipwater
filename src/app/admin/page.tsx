"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleDollarSign,
  Droplets,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";

import { ADMIN_EMAIL, isAdminEmail } from "@/lib/admin";
import { setFlashMessage } from "@/lib/flash-message";
import { Navbar } from "@/components/navbar";
import {
  LANDING_CATEGORY_NAV,
  getLandingCategoryLabel,
} from "@/lib/landing-categories";
import { processProductImageFile } from "@/lib/process-product-image";
import { getSupabaseClient } from "@/lib/supabase";

const landingCatalog = [
  {
    category: "Purified Water",
    name: "SIP Purified Water",
    size: "350 ml",
    pack: "24 / case",
    bottlePrice: "7",
    casePrice: "168",
  },
  {
    category: "Purified Water",
    name: "SIP Purified Water",
    size: "500 ml",
    pack: "24 / case",
    bottlePrice: "9",
    casePrice: "216",
  },
  {
    category: "Purified Water",
    name: "SIP Purified Water",
    size: "1000 ml",
    pack: "12 / case",
    bottlePrice: "15",
    casePrice: "180",
  },
  {
    category: "Purified Water",
    name: "Original Grapefruit Sugar Free",
    size: "350 ml",
    pack: "12 / case",
    bottlePrice: "30",
    casePrice: "360",
  },
  {
    category: "Purified Water",
    name: "Honey Yuzo Sugar Free Electrolytes",
    size: "350 ml",
    pack: "12 / case",
    bottlePrice: "30",
    casePrice: "360",
  },
  {
    category: "Carbonated Drinks",
    name: "Salty Lychee",
    size: "325 ml",
    pack: "24 / case",
    bottlePrice: "42",
    casePrice: "1008",
  },
  {
    category: "Carbonated Drinks",
    name: "Original Citrus",
    size: "325 ml",
    pack: "24 / case",
    bottlePrice: "42",
    casePrice: "1008",
  },
  {
    category: "Carbonated Drinks",
    name: "Lemon",
    size: "325 ml",
    pack: "24 / case",
    bottlePrice: "42",
    casePrice: "1008",
  },
  {
    category: "Yoghurt Drinks",
    name: "Original",
    size: "310 ml",
    pack: "24 / case",
    bottlePrice: "42",
    casePrice: "1008",
  },
  {
    category: "Yoghurt Drinks",
    name: "Grape Juice (10×6)",
    size: "115 ml",
    pack: "10 / case",
    bottlePrice: "72",
    casePrice: "720",
    note: "₱12.00 each",
  },
  {
    category: "Yoghurt Drinks",
    name: "Orange Juice (10×6)",
    size: "115 ml",
    pack: "10 / case",
    bottlePrice: "72",
    casePrice: "720",
    note: "₱12.00 each",
  },
  {
    category: "Carbonated Drinks",
    name: "Lemon Lime Prebiotic",
    size: "330 ml",
    pack: "24 / case",
    bottlePrice: "36",
    casePrice: "864",
  },
  {
    category: "Carbonated Drinks",
    name: "Yogurt Soda Prebiotic",
    size: "330 ml",
    pack: "24 / case",
    bottlePrice: "36",
    casePrice: "864",
  },
  {
    category: "Snacks",
    name: "Coconut Ice Cream Egg Roll (12×20)",
    size: "20 g",
    pack: "12 / case",
    bottlePrice: "200",
    casePrice: "2400",
    note: "10 / pack",
  },
  {
    category: "Snacks",
    name: "Egg Yolk Egg Roll (12×20)",
    size: "20 g",
    pack: "12 / case",
    bottlePrice: "200",
    casePrice: "2400",
    note: "10 / pack",
  },
];

export default function AdminLandingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>("Admin");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    users: 0,
    orders: 0,
    sales: 0,
  });
  const [products, setProducts] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      size: string;
      pack: string;
      bottle_price: number;
      case_price: number;
      note: string | null;
      photo_url: string | null;
    }>
  >([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productFormLoading, setProductFormLoading] = useState(false);
  const [productUpdateLoading, setProductUpdateLoading] = useState(false);
  const [productDeleteLoading, setProductDeleteLoading] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productSuccess, setProductSuccess] = useState<string | null>(null);
  const [productMessageScope, setProductMessageScope] = useState<
    "add" | "edit" | "delete" | null
  >(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    size: "",
    pack: "",
    bottlePrice: "",
    casePrice: "",
    note: "",
    photoUrl: "",
  });
  const [newProductPhotoFile, setNewProductPhotoFile] = useState<File | null>(null);
  const [editProductId, setEditProductId] = useState("");
  const [editProduct, setEditProduct] = useState({
    name: "",
    category: "",
    size: "",
    pack: "",
    bottlePrice: "",
    casePrice: "",
    note: "",
    photoUrl: "",
  });
  const [editProductPhotoFile, setEditProductPhotoFile] = useState<File | null>(null);
  const [deleteProductId, setDeleteProductId] = useState("");
  const addProductRef = useRef<HTMLElement>(null);
  const editProductRef = useRef<HTMLElement>(null);
  const deleteProductRef = useRef<HTMLElement>(null);

  const categories = [...LANDING_CATEGORY_NAV];
  const names = [
    ...new Set(
      landingCatalog
        .filter((item) =>
          newProduct.category ? item.category === newProduct.category : true
        )
        .map((item) => item.name)
    ),
  ];
  const sizes = [
    ...new Set(
      landingCatalog
        .filter((item) =>
          newProduct.category ? item.category === newProduct.category : true
        )
        .filter((item) => (newProduct.name ? item.name === newProduct.name : true))
        .map((item) => item.size)
    ),
  ];
  const packs = [
    ...new Set(
      landingCatalog
        .filter((item) =>
          newProduct.category ? item.category === newProduct.category : true
        )
        .filter((item) => (newProduct.name ? item.name === newProduct.name : true))
        .filter((item) => (newProduct.size ? item.size === newProduct.size : true))
        .map((item) => item.pack)
    ),
  ];
  const bottlePrices = [
    ...new Set(
      landingCatalog
        .filter((item) =>
          newProduct.category ? item.category === newProduct.category : true
        )
        .filter((item) => (newProduct.name ? item.name === newProduct.name : true))
        .filter((item) => (newProduct.size ? item.size === newProduct.size : true))
        .filter((item) => (newProduct.pack ? item.pack === newProduct.pack : true))
        .map((item) => item.bottlePrice)
    ),
  ];
  const casePrices = [
    ...new Set(
      landingCatalog
        .filter((item) =>
          newProduct.category ? item.category === newProduct.category : true
        )
        .filter((item) => (newProduct.name ? item.name === newProduct.name : true))
        .filter((item) => (newProduct.size ? item.size === newProduct.size : true))
        .filter((item) => (newProduct.pack ? item.pack === newProduct.pack : true))
        .filter((item) =>
          newProduct.bottlePrice ? item.bottlePrice === newProduct.bottlePrice : true
        )
        .map((item) => item.casePrice)
    ),
  ];
  const productOrderMap = new Map(
    landingCatalog.map((item, index) => [
      `${item.category}__${item.name}__${item.size}__${item.pack}`,
      index,
    ])
  );

  const addProductCategoryOk = Boolean(newProduct.category);
  const addProductNameOk = addProductCategoryOk && Boolean(newProduct.name);
  const addProductSizeOk = addProductNameOk && Boolean(newProduct.size);
  const addProductPackOk = addProductSizeOk && Boolean(newProduct.pack);
  const addProductBottleOk = addProductPackOk && Boolean(newProduct.bottlePrice);
  const addProductCaseOk =
    addProductBottleOk && Boolean(newProduct.casePrice);
  const addProductSelectDisabledClass =
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-60";

  const deleteTargetProduct = products.find((p) => p.id === deleteProductId);

  const getProductOrder = (product: {
    category: string;
    name: string;
    size: string;
    pack: string;
  }) => {
    const label = getLandingCategoryLabel(product.category, product.name);
    return (
      productOrderMap.get(
        `${label}__${product.name}__${product.size}__${product.pack}`
      ) ?? Number.MAX_SAFE_INTEGER
    );
  };

  const fetchProducts = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, category, size, pack, bottle_price, case_price, note, photo_url"
      );

    if (error) {
      setProductError(
        "Products table is missing or restricted. Create a 'products' table and allow admin access."
      );
      setProductsLoading(false);
      return;
    }

    const rows = (data ?? []) as Array<{
      id: string;
      name: string;
      category: string;
      size: string;
      pack: string;
      bottle_price: number;
      case_price: number;
      note: string | null;
      photo_url: string | null;
    }>;

    const sortedProducts = [...rows].sort((a, b) => {
      const orderA = getProductOrder(a);
      const orderB = getProductOrder(b);
      if (orderA !== orderB) return orderA - orderB;

      // Keep unknown/new items stable and readable after known catalog items.
      return `${a.category} ${a.name} ${a.size}`.localeCompare(
        `${b.category} ${b.name} ${b.size}`
      );
    });

    setProducts(sortedProducts);
    setProductsLoading(false);
  };

  const uploadProductPhoto = async (file: File) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const processed =
      file.type.startsWith("image/") && typeof document !== "undefined"
        ? await processProductImageFile(file)
        : file;

    const extFromName = processed.name.includes(".")
      ? processed.name.split(".").pop()
      : "jpg";
    const safeExtension = extFromName?.toLowerCase() || "jpg";
    const filePath = `products/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, processed, { upsert: false });

    if (uploadError) {
      throw new Error(
        `Photo upload failed: ${uploadError.message}. Ensure 'product-images' bucket exists and allows uploads.`
      );
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  useEffect(() => {
    let isMounted = true;
    let pollIntervalId: number | null = null;

    const loadAdmin = async () => {
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

      const fullName =
        (user.user_metadata?.full_name as string | undefined) ?? "Admin";
      if (!isMounted) return;
      setDisplayName(fullName);
      setLoading(false);

      const refreshStats = async () => {
        const [profilesResult, ordersCountResult, ordersTotalResult] =
          await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }),
            supabase.from("orders").select("id", { count: "exact", head: true }),
            supabase.from("orders").select("total_price,status"),
          ]);

        if (
          profilesResult.error ||
          ordersCountResult.error ||
          ordersTotalResult.error
        ) {
          if (!isMounted) return;
          setStatsError(
            "Unable to load one or more admin stats. Check table permissions and RLS policies."
          );
          setStatsLoading(false);
          return;
        }

        const orderRows = (ordersTotalResult.data ?? []) as Array<{
          total_price: number | string | null;
          status: string | null;
        }>;

        const salesTotal = orderRows.reduce((sum, order) => {
          const status = String(order.status ?? "").trim().toLowerCase();
          if (status !== "delivered") return sum;

          const value = Number(order.total_price ?? 0);
          return Number.isFinite(value) ? sum + value : sum;
        }, 0);

        const totalUsersExcludingAdmin = Math.max(
          0,
          (profilesResult.count ?? 0) - 1
        );

        if (!isMounted) return;
        setStats({
          users: totalUsersExcludingAdmin,
          orders: ordersCountResult.count ?? 0,
          sales: salesTotal,
        });
        setStatsError(null);
        setStatsLoading(false);
      };

      await refreshStats();
      // Fallback polling to keep dashboard stats in sync even if realtime events
      // are delayed/missed in the current environment.
      pollIntervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void refreshStats();
      }, 6000);
      await fetchProducts();

      const statsChannel = supabase
        .channel("admin-live-stats")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          () => {
            void refreshStats();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders" },
          () => {
            void refreshStats();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => {
            void refreshStats();
          }
        )
        .subscribe();

      return () => {
        if (pollIntervalId) window.clearInterval(pollIntervalId);
        supabase.removeChannel(statsChannel);
      };
    };

    let cleanup: (() => void) | undefined;
    void loadAdmin().then((cleanupFn) => {
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

  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProductMessageScope("add");
    setProductError(null);
    setProductSuccess(null);
    setProductFormLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setProductError("Supabase is not configured.");
      setProductFormLoading(false);
      return;
    }

    const bottlePrice = Number(newProduct.bottlePrice);
    const casePrice = Number(newProduct.casePrice);

    if (!Number.isFinite(bottlePrice) || !Number.isFinite(casePrice)) {
      setProductError("Bottle price and case price must be valid numbers.");
      setProductFormLoading(false);
      return;
    }

    let photoUrlToSave = newProduct.photoUrl.trim() || null;
    if (newProductPhotoFile) {
      try {
        photoUrlToSave = await uploadProductPhoto(newProductPhotoFile);
      } catch (uploadError) {
        setProductError(
          uploadError instanceof Error ? uploadError.message : "Photo upload failed."
        );
        setProductFormLoading(false);
        return;
      }
    }

    const insertPayload = {
      name: newProduct.name,
      category: newProduct.category,
      size: newProduct.size,
      pack: newProduct.pack,
      bottle_price: bottlePrice,
      case_price: casePrice,
      note: newProduct.note || null,
      photo_url: photoUrlToSave,
    };

    const { error } = await supabase.from("products").insert(insertPayload as never);

    if (error) {
      setProductError(error.message);
      setProductFormLoading(false);
      return;
    }

    setProductSuccess("Product added successfully.");
    setNewProduct({
      name: "",
      category: "",
      size: "",
      pack: "",
      bottlePrice: "",
      casePrice: "",
      note: "",
      photoUrl: "",
    });
    setNewProductPhotoFile(null);
    setProductFormLoading(false);
    await fetchProducts();
  };

  const handleEditProductSelect = (id: string) => {
    setEditProductId(id);
    const selected = products.find((product) => product.id === id);
    if (!selected) {
      setEditProduct({
        name: "",
        category: "",
        size: "",
        pack: "",
        bottlePrice: "",
        casePrice: "",
        note: "",
        photoUrl: "",
      });
      return;
    }

    setEditProduct({
      name: selected.name,
      category: getLandingCategoryLabel(selected.category, selected.name),
      size: selected.size,
      pack: selected.pack,
      bottlePrice: String(selected.bottle_price),
      casePrice: String(selected.case_price),
      note: selected.note ?? "",
      photoUrl: selected.photo_url ?? "",
    });
    setEditProductPhotoFile(null);
  };

  const handleUpdateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProductMessageScope("edit");
    setProductError(null);
    setProductSuccess(null);
    setProductUpdateLoading(true);

    if (!editProductId) {
      setProductError("Please select a product to edit.");
      setProductUpdateLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setProductError("Supabase is not configured.");
      setProductUpdateLoading(false);
      return;
    }

    const bottlePrice = Number(editProduct.bottlePrice);
    const casePrice = Number(editProduct.casePrice);

    if (!Number.isFinite(bottlePrice) || !Number.isFinite(casePrice)) {
      setProductError("Bottle price and case price must be valid numbers.");
      setProductUpdateLoading(false);
      return;
    }

    let photoUrlToSave = editProduct.photoUrl.trim() || null;
    if (editProductPhotoFile) {
      try {
        photoUrlToSave = await uploadProductPhoto(editProductPhotoFile);
      } catch (uploadError) {
        setProductError(
          uploadError instanceof Error ? uploadError.message : "Photo upload failed."
        );
        setProductUpdateLoading(false);
        return;
      }
    }

    const updatePayload = {
      name: editProduct.name,
      category: editProduct.category,
      size: editProduct.size,
      pack: editProduct.pack,
      bottle_price: bottlePrice,
      case_price: casePrice,
      note: editProduct.note || null,
      photo_url: photoUrlToSave,
    };

    const { error } = await supabase
      .from("products")
      .update(updatePayload as never)
      .eq("id", editProductId);

    if (error) {
      setProductError(error.message);
      setProductUpdateLoading(false);
      return;
    }

    setProductSuccess("Product updated successfully.");
    setProductUpdateLoading(false);
    await fetchProducts();
  };

  const handleDeleteProduct = async () => {
    setProductMessageScope("delete");
    setProductError(null);
    setProductSuccess(null);
    setProductDeleteLoading(true);

    if (!deleteProductId) {
      setProductError("Please select a product to delete.");
      setProductDeleteLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setProductError("Supabase is not configured.");
      setProductDeleteLoading(false);
      return;
    }

    const { error } = await supabase.from("products").delete().eq("id", deleteProductId);

    if (error) {
      setProductError(error.message);
      setProductDeleteLoading(false);
      return;
    }

    setProductSuccess("Product deleted successfully.");
    setDeleteProductId("");
    if (editProductId === deleteProductId) {
      setEditProductId("");
      setEditProduct({
        name: "",
        category: "",
        size: "",
        pack: "",
        bottlePrice: "",
        casePrice: "",
        note: "",
        photoUrl: "",
      });
      setEditProductPhotoFile(null);
    }
    setProductDeleteLoading(false);
    await fetchProducts();
  };

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
        <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-lg shadow-sky-500/10 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-sky-700">
                Admin Panel
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Sip Water Admin Landing Page
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                You are authenticated as admin. Manage users, orders, and
                delivery operations from this dashboard.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-sky-700">
                Admin email
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {ADMIN_EMAIL}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="size-4 text-sky-600" />
              Users
            </h2>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {statsLoading ? "..." : stats.users.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-600">Total registered users</p>
          </article>

          <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Truck className="size-4 text-sky-600" />
              Orders
            </h2>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {statsLoading ? "..." : stats.orders.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-600">Total orders placed</p>
          </article>

          <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CircleDollarSign className="size-4 text-sky-600" />
              Sales
            </h2>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {statsLoading ? "..." : `₱${stats.sales.toLocaleString()}`}
            </p>
            <p className="mt-1 text-xs text-slate-600">Total sales revenue</p>
          </article>
        </section>

        {statsError ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {statsError}
          </p>
        ) : null}

        <section ref={addProductRef} className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <article className="min-w-0 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Add Product</h2>
            <p className="mt-1 text-sm text-slate-600">
              Create a new catalog item for customer orders.
            </p>

            <form className="mt-5 space-y-3" onSubmit={handleAddProduct}>
              <select
                value={newProduct.category}
                onChange={(event) =>
                  setNewProduct({
                    category: event.target.value,
                    name: "",
                    size: "",
                    pack: "",
                    bottlePrice: "",
                    casePrice: "",
                    note: "",
                    photoUrl: "",
                  })
                }
                className="h-10 w-full min-w-0 rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={newProduct.name}
                disabled={!addProductCategoryOk}
                onChange={(event) =>
                  setNewProduct((prev) => ({
                    ...prev,
                    name: event.target.value,
                    size: "",
                    pack: "",
                    bottlePrice: "",
                    casePrice: "",
                    note: "",
                  }))
                }
                className={`h-10 w-full min-w-0 rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 ${addProductSelectDisabledClass}`}
                required
              >
                <option value="">Select product name</option>
                {names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={newProduct.size}
                  disabled={!addProductNameOk}
                  onChange={(event) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      size: event.target.value,
                      pack: "",
                      bottlePrice: "",
                      casePrice: "",
                      note: "",
                    }))
                  }
                  className={`h-10 w-full min-w-0 rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 ${addProductSelectDisabledClass}`}
                  required
                >
                  <option value="">Select size</option>
                  {sizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <select
                  value={newProduct.pack}
                  disabled={!addProductSizeOk}
                  onChange={(event) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      pack: event.target.value,
                      bottlePrice: "",
                      casePrice: "",
                      note: "",
                    }))
                  }
                  className={`h-10 w-full min-w-0 rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 ${addProductSelectDisabledClass}`}
                  required
                >
                  <option value="">Select pack</option>
                  {packs.map((pack) => (
                    <option key={pack} value={pack}>
                      {pack}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={newProduct.bottlePrice}
                  disabled={!addProductPackOk}
                  onChange={(event) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      bottlePrice: event.target.value,
                      casePrice: "",
                      note: "",
                    }))
                  }
                  className={`h-10 w-full min-w-0 rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 ${addProductSelectDisabledClass}`}
                  required
                >
                  <option value="">Select bottle price</option>
                  {bottlePrices.map((price) => (
                    <option key={price} value={price}>
                      ₱{Number(price).toLocaleString()}
                    </option>
                  ))}
                </select>
                <select
                  value={newProduct.casePrice}
                  disabled={!addProductBottleOk}
                  onChange={(event) => {
                    const selectedCasePrice = event.target.value;
                    const matched = landingCatalog.find(
                      (item) =>
                        item.category === newProduct.category &&
                        item.name === newProduct.name &&
                        item.size === newProduct.size &&
                        item.pack === newProduct.pack &&
                        item.bottlePrice === newProduct.bottlePrice &&
                        item.casePrice === selectedCasePrice
                    );

                    setNewProduct((prev) => ({
                      ...prev,
                      casePrice: selectedCasePrice,
                      note: matched?.note ?? "",
                    }));
                  }}
                  className={`h-10 w-full min-w-0 rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 ${addProductSelectDisabledClass}`}
                  required
                >
                  <option value="">Select case price</option>
                  {casePrices.map((price) => (
                    <option key={price} value={price}>
                      ₱{Number(price).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Optional note"
                value={newProduct.note}
                disabled={!addProductCaseOk}
                onChange={(event) =>
                  setNewProduct((prev) => ({ ...prev, note: event.target.value }))
                }
                className={`h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 ${addProductSelectDisabledClass}`}
              />
              <input
                type="url"
                placeholder="Photo URL (optional)"
                value={newProduct.photoUrl}
                disabled={!addProductCaseOk}
                onChange={(event) =>
                  setNewProduct((prev) => ({ ...prev, photoUrl: event.target.value }))
                }
                className={`h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 ${addProductSelectDisabledClass}`}
              />
              <label
                className={`block space-y-2 ${!addProductCaseOk ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span
                  className={`text-xs font-medium ${addProductCaseOk ? "text-slate-700" : "text-slate-400"}`}
                >
                  Upload photo (optional)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!addProductCaseOk}
                  onChange={(event) =>
                    setNewProductPhotoFile(event.target.files?.[0] ?? null)
                  }
                  className={`w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-400 ${addProductSelectDisabledClass} ${addProductCaseOk ? "text-slate-700" : "text-slate-500"}`}
                />
              </label>

              {productMessageScope === "add" && productError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {productError}
                </p>
              ) : null}
              {productMessageScope === "add" && productSuccess ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {productSuccess}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!addProductCaseOk || productFormLoading}
                className="inline-flex h-10 items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {productFormLoading ? "Adding..." : "Add product"}
              </button>
            </form>
          </article>

          <article className="min-w-0 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Product List</h2>
            <p className="mt-1 text-sm text-slate-600">
              Current items from your `products` table.
            </p>

            {productsLoading ? (
              <p className="mt-4 text-sm text-slate-600">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
                No products yet.
              </p>
            ) : (
              <div className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-sky-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-sky-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Size</th>
                      <th className="px-3 py-2 font-semibold">Photo</th>
                      <th className="px-3 py-2 font-semibold">Bottle</th>
                      <th className="px-3 py-2 font-semibold">Case</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-t border-sky-100">
                        <td className="px-3 py-2 text-slate-800">{product.name}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {getLandingCategoryLabel(product.category, product.name)}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{product.size}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {product.photo_url ? (
                            <a
                              href={product.photo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-700 underline-offset-2 hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-800">
                          ₱{Number(product.bottle_price).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-slate-800">
                          ₱{Number(product.case_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article
            ref={editProductRef}
            className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">Edit Product</h2>
            <p className="mt-1 text-sm text-slate-600">
              Select a product and update its details.
            </p>
            <form className="mt-5 space-y-3" onSubmit={handleUpdateProduct}>
              <select
                value={editProductId}
                onChange={(event) => handleEditProductSelect(event.target.value)}
                className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                required
              >
                <option value="">Select product to edit</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {getLandingCategoryLabel(product.category, product.name)} —{" "}
                    {product.name} - {product.size}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Name"
                value={editProduct.name}
                onChange={(event) =>
                  setEditProduct((prev) => ({ ...prev, name: event.target.value }))
                }
                className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
              <select
                value={editProduct.category}
                onChange={(event) =>
                  setEditProduct((prev) => ({ ...prev, category: event.target.value }))
                }
                className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Size"
                  value={editProduct.size}
                  onChange={(event) =>
                    setEditProduct((prev) => ({ ...prev, size: event.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  required
                />
                <input
                  type="text"
                  placeholder="Pack"
                  value={editProduct.pack}
                  onChange={(event) =>
                    setEditProduct((prev) => ({ ...prev, pack: event.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  placeholder="Bottle price"
                  value={editProduct.bottlePrice}
                  onChange={(event) =>
                    setEditProduct((prev) => ({
                      ...prev,
                      bottlePrice: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  required
                />
                <input
                  type="number"
                  placeholder="Case price"
                  value={editProduct.casePrice}
                  onChange={(event) =>
                    setEditProduct((prev) => ({
                      ...prev,
                      casePrice: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Optional note"
                value={editProduct.note}
                onChange={(event) =>
                  setEditProduct((prev) => ({ ...prev, note: event.target.value }))
                }
                className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                type="url"
                placeholder="Photo URL (optional)"
                value={editProduct.photoUrl}
                onChange={(event) =>
                  setEditProduct((prev) => ({ ...prev, photoUrl: event.target.value }))
                }
                className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              />
              {editProduct.photoUrl ? (
                <a
                  href={editProduct.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
                >
                  View current photo
                </a>
              ) : (
                <p className="text-xs text-slate-500">No current photo</p>
              )}
              <label className="block space-y-2">
                <span className="text-xs font-medium text-slate-700">
                  Upload new photo (optional)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setEditProductPhotoFile(event.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-400"
                />
              </label>
              <p className="text-xs text-slate-500">
                If you do not upload a new photo, the existing photo is kept.
              </p>
              {productMessageScope === "edit" && productError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {productError}
                </p>
              ) : null}
              {productMessageScope === "edit" && productSuccess ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {productSuccess}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={productUpdateLoading}
                className="inline-flex h-10 items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {productUpdateLoading ? "Updating..." : "Update product"}
              </button>
            </form>
          </article>

          <article
            ref={deleteProductRef}
            className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">Delete Product</h2>
            <p className="mt-1 text-sm text-slate-600">
              Select a product to remove it from the catalog.
            </p>
            <div className="mt-5 space-y-3">
              <select
                value={deleteProductId}
                onChange={(event) => setDeleteProductId(event.target.value)}
                className="h-10 w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">Select product to delete</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {getLandingCategoryLabel(product.category, product.name)} —{" "}
                    {product.name} - {product.size}
                  </option>
                ))}
              </select>
              {deleteTargetProduct ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/40 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="shrink-0 overflow-hidden rounded-xl border border-sky-100 bg-white">
                    {deleteTargetProduct.photo_url ? (
                      <img
                        src={deleteTargetProduct.photo_url}
                        alt={`${deleteTargetProduct.name} product photo`}
                        className="h-36 w-36 object-contain sm:h-40 sm:w-40"
                      />
                    ) : (
                      <div className="flex h-36 w-36 items-center justify-center text-sky-300 sm:h-40 sm:w-40">
                        <Droplets className="size-10" aria-hidden={true} />
                      </div>
                    )}
                  </div>
                  <p className="text-center text-xs text-slate-600 sm:text-left">
                    <span className="font-semibold text-slate-800">
                      {deleteTargetProduct.name}
                    </span>
                    <span className="block text-slate-500">
                      {getLandingCategoryLabel(
                        deleteTargetProduct.category,
                        deleteTargetProduct.name
                      )}{" "}
                      · {deleteTargetProduct.size}
                    </span>
                  </p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={productDeleteLoading}
                className="inline-flex h-10 items-center justify-center rounded-full bg-red-500 px-5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {productDeleteLoading ? "Deleting..." : "Delete product"}
              </button>
              {productMessageScope === "delete" && productError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {productError}
                </p>
              ) : null}
              {productMessageScope === "delete" && productSuccess ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {productSuccess}
                </p>
              ) : null}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

