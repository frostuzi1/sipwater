import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ userId: string }> }
) {
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      {
        error:
          "Server is not configured for Supabase Admin deletes. Missing env: " +
          missing.join(", "),
      },
      { status: 500 }
    );
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(
    token
  );

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Unable to read user token." },
      { status: 401 }
    );
  }

  if (!isAdminEmail(authData.user.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Delete user-related rows first (so we don't leave orphaned data).
  const { error: ordersError } = await supabaseAdmin
    .from("orders")
    .delete()
    .eq("user_id", userId);

  if (ordersError) {
    return NextResponse.json(
      { error: ordersError.message },
      { status: 500 }
    );
  }

  const { error: profilesError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profilesError) {
    return NextResponse.json(
      { error: profilesError.message },
      { status: 500 }
    );
  }

  // Finally, delete from Supabase Auth.
  const { error: authDeleteError } =
    await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    return NextResponse.json(
      { error: authDeleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

