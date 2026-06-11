import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_SIZE = 15 * 1024 * 1024; // 15 Mo

// Refus des cibles internes (anti-SSRF)
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv4 littérales privées / réservées
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  // IPv6 littérales
  if (h.includes(":")) return true;
  return false;
}

/**
 * Proxy d'images : contourne le CORS pour la composition canvas.
 * N'accepte que HTTPS vers des hôtes publics, et uniquement du contenu image.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Paramètre url requis" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || isPrivateHost(parsed.hostname)) {
    return NextResponse.json({ error: "Hôte non autorisé" }, { status: 403 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Referer: `${parsed.protocol}//${parsed.hostname}/`,
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Image inaccessible (${res.status})` }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Le contenu n'est pas une image" }, { status: 415 });
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "Image trop volumineuse" }, { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
