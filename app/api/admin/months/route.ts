// app/api/admin/months/route.ts
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const base = process.env.APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "";
    if (!base) return NextResponse.json({ ok: false, error: "missing_APPS_SCRIPT_URL" }, { status: 500 });

    const url = new URL(base);
    url.searchParams.set("action", "getMonthlySheets");

    const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    const raw = await res.text();
    try {
      const json = JSON.parse(raw);
      return NextResponse.json(json);
    } catch {
      return NextResponse.json({ ok: false, error: "bad_json_from_gas", raw }, { status: 502 });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
