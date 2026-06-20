import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Génération d'image IA (sans clé, gratuit) via Pollinations/Flux.
 * Sert de FILET DE SÉCURITÉ qualité : quand un restaurant n'a pas de vraie
 * photo HD disponible, on produit une image d'ambiance nette en haute
 * définition plutôt que d'afficher une photo floue 480p.
 *
 * Renvoie une URL proxifiée (CORS OK pour le montage canvas).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const kind = req.nextUrl.searchParams.get("kind") || "ambiance"; // ambiance | plat | facade
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });

  const styles: Record<string, string> = {
    ambiance:
      "intérieur élégant de restaurant parisien haut de gamme, lumière chaude tamisée, tables dressées avec soin, ambiance chic et cosy le soir",
    plat:
      "assiette gastronomique raffinée d'un restaurant parisien étoilé, dressage soigné, photographie culinaire professionnelle, lumière naturelle",
    facade:
      "façade élégante d'un restaurant parisien chic au crépuscule, terrasse, rue haussmannienne, lumières dorées",
  };
  const subject = styles[kind] || styles.ambiance;

  const prompt = `${subject}. ${q}. Photo réaliste, ultra détaillée, qualité magazine, 8k, profondeur de champ, sans texte, sans watermark.`;
  const seed = Math.floor(Math.random() * 1_000_000);

  // Flux = meilleur rendu photoréaliste. 1080x1350 (≥1080 → net dans le montage).
  const polUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1080&height=1350&nologo=true&model=flux&seed=${seed}`;

  const proxied = `/api/images/proxy?url=${encodeURIComponent(polUrl)}`;

  return NextResponse.json({
    photo: {
      src: proxied,
      thumb: proxied,
      source: "Image IA",
      width: 1080,
      height: 1350,
      hd: true,
      ai: true,
    },
  });
}
