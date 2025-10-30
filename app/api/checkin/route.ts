// app/api/checkin/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // giữ nguyên body dạng text để tránh preflight & sai encoding
    const bodyText = await req.text();

    const gasUrl =
      process.env.APPS_SCRIPT_URL ||
      process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
      "";

    if (!gasUrl) {
      return NextResponse.json(
        { ok: false, error: "missing_APPS_SCRIPT_URL" },
        { status: 500 }
      );
    }

    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: bodyText,
    });

    const raw = await res.text();
    // cố gắng parse JSON từ Apps Script
    try {
      const json = JSON.parse(raw);
      // trả về same-origin -> không còn CORS
      return NextResponse.json(json, { status: 200 });
    } catch {
      return NextResponse.json(
        { ok: false, error: "bad_json_from_gas", raw },
        { status: 502 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
