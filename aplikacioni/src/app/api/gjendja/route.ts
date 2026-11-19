import { NextRequest, NextResponse } from "next/server";
import { lexoGjendjen } from "@/lib/gjendja";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie" };
export async function GET(request: NextRequest) {
  const tripId = request.nextUrl.searchParams.get("udhetimi");
  if (tripId !== null && (!tripId.trim() || tripId.length > 100))
    return NextResponse.json({ error: "Udhëtimi nuk është i vlefshëm." }, { status: 400, headers });
  try {
    const data = await lexoGjendjen(tripId);
    return NextResponse.json(data ?? { error: "Hyr në llogari." }, { status: data ? 200 : 401, headers });
  } catch {
    return NextResponse.json({ error: "Gjendja nuk mund të lexohet tani." }, { status: 503, headers });
  }
}
