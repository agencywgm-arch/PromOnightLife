import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Web image search endpoint — disabled due to server-side blocking.
 * All search engines (Google, DuckDuckGo, Bing, etc.) block automated
 * requests from cloud servers like Vercel. The frontend now shows an
 * integrated Google Images search panel instead.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });

  // Fallback: return signal to show manual search panel
  return NextResponse.json({
    provider: "web",
    photos: [],
    fallback: true,
  });
}
