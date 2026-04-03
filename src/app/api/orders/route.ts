import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { validateOrderPayload } from "@/lib/validate-order-payload";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return NextResponse.json(
      { error: "Missing authorization token." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validated = validateOrderPayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { idempotency_key, total_price, items } = validated.data;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { error: userError?.message ?? "Invalid session." },
      { status: 401 }
    );
  }

  const userId = userData.user.id;

  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("idempotency_key", idempotency_key)
    .maybeSingle();

  const existingRow = existing as { id: string } | null;
  if (existingRow?.id) {
    return NextResponse.json({
      ok: true,
      orderId: existingRow.id,
      duplicate: true,
    });
  }

  const insertPayload = {
    user_id: userId,
    total_price,
    status: "pending",
    items,
    idempotency_key,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("orders")
    .insert(insertPayload as never)
    .select("id")
    .single();

  if (insertError) {
    const msg = insertError.message ?? "";
    const isDup =
      insertError.code === "23505" ||
      msg.toLowerCase().includes("duplicate") ||
      msg.toLowerCase().includes("unique");

    if (isDup) {
      const { data: again } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();
      const row = again as { id: string } | null;
      if (row?.id) {
        return NextResponse.json({
          ok: true,
          orderId: row.id,
          duplicate: true,
        });
      }
    }

    if (
      msg.includes("idempotency_key") ||
      msg.includes("column") ||
      insertError.code === "PGRST204"
    ) {
      const { data: legacy, error: legacyError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          total_price,
          status: "pending",
          items,
        } as never)
        .select("id")
        .single();

      if (legacyError) {
        return NextResponse.json(
          { error: legacyError.message },
          { status: 400 }
        );
      }
      const leg = legacy as { id: string };
      return NextResponse.json({
        ok: true,
        orderId: leg.id,
        duplicate: false,
        warning:
          "Order saved without idempotency (add idempotency_key column — see supabase/migrations).",
      });
    }

    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const row = inserted as { id: string };
  return NextResponse.json({
    ok: true,
    orderId: row.id,
    duplicate: false,
  });
}
