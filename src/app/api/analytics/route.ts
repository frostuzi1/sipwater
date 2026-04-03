import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const MAX_NAME = 80;
const MAX_PAYLOAD_KEYS = 40;

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const name = String(o.name ?? "").trim();
  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ error: "Invalid event name." }, { status: 400 });
  }

  let payload: Record<string, unknown> = {};
  if (o.payload != null) {
    if (typeof o.payload !== "object" || Array.isArray(o.payload)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    const entries = Object.entries(o.payload as Record<string, unknown>).slice(
      0,
      MAX_PAYLOAD_KEYS
    );
    payload = Object.fromEntries(
      entries.map(([k, v]) => [
        String(k).slice(0, 64),
        typeof v === "string"
          ? v.slice(0, 500)
          : typeof v === "number" && Number.isFinite(v)
            ? v
            : typeof v === "boolean"
              ? v
              : null,
      ])
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });

  let userId: string | null = null;
  if (token) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }

  const { error } = await supabase.from("analytics_events").insert({
    name,
    payload,
    user_id: userId,
  } as never);

  if (error) {
    // Table or policy may be missing — do not break the app.
    if (
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      error.message.includes("analytics_events")
    ) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
