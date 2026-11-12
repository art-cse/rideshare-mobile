import { NextRequest, NextResponse } from "next/server";
import { lexoPreferimet, ruajPreferimin } from "@/lib/preferimet";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const ids = await lexoPreferimet();
    return NextResponse.json({ ids }, { status: ids ? 200 : 401, headers });
  } catch { return NextResponse.json({ error: "databaza" }, { status: 503, headers }); }
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "origin" }, { status: 403, headers });
  try {
    const body = await request.json();
    const result = await ruajPreferimin(body?.id);
    return NextResponse.json(result, { status: result.ok ? 200 : result.error === "hyr" ? 401 : 400, headers });
  } catch { return NextResponse.json({ ok: false, error: "databaza" }, { status: 503, headers }); }
}
