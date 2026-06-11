import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; index: string } }
) {
  const contenu = await prisma.contenu.findUnique({ where: { id: params.id } });
  if (!contenu) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let slides: { imageData?: string | null }[] = [];
  try {
    slides = JSON.parse(contenu.slides || "[]");
  } catch {
    return NextResponse.json({ error: "Slides invalides" }, { status: 500 });
  }

  const idx = parseInt(params.index, 10);
  const slide = slides[idx];
  if (!slide?.imageData) {
    return NextResponse.json({ error: "Image non disponible" }, { status: 404 });
  }

  // imageData est un data URL : "data:image/jpeg;base64,/9j/..."
  const base64 = slide.imageData.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
