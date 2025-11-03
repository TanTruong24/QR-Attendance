// app/api/checkin/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const bodyText = await req.text();
    const hasBody = bodyText.trim().length > 0;

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

    // Ghép query từ client vào đích GAS
    const target = new URL(gasUrl);
    url.searchParams.forEach((v, k) => target.searchParams.append(k, v));

    const res = await fetch(target.toString(), {
      method: "POST",
      headers: hasBody ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
      body: hasBody ? bodyText : undefined, // OAuth: không body
    });

    const raw = await res.text();
    try {
      const json = JSON.parse(raw);
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
