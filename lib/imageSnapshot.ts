/**
 * Capture une image distante en data URL pleine résolution.
 *
 * Pourquoi : les URLs des photos sociales (Instagram, Serper) sont signées et
 * expirent vite. En les figeant en data URL DÈS la sélection — pendant que le
 * lien est encore valide — la photo ne peut plus jamais expirer ni sortir vide
 * au montage du carrousel. On capture la résolution native (pas d'upscale ici,
 * le montage s'en charge) pour conserver le maximum de qualité.
 */

function proxied(u: string): string {
  return u.startsWith("data:") || u.startsWith("/api/images/proxy")
    ? u
    : `/api/images/proxy?url=${encodeURIComponent(u)}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("load failed"));
    im.src = url;
  });
}

export type Snapshot = { dataUrl: string; width: number; height: number; thumbUsed: boolean };

/**
 * Tente l'originale (haute résolution), puis la miniature en secours.
 * Retourne null si rien n'a pu être capturé (canvas teinté / liens morts).
 */
export async function snapshotImage(
  originalUrl: string,
  thumbUrl?: string
): Promise<Snapshot | null> {
  let img: HTMLImageElement | null = null;
  let thumbUsed = false;

  try {
    img = await loadImage(originalUrl);
  } catch {
    if (thumbUrl && thumbUrl !== originalUrl) {
      try {
        img = await loadImage(proxied(thumbUrl));
        thumbUsed = true;
      } catch {
        img = null;
      }
    }
  }

  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0);

  try {
    // JPEG 0.95 : qualité quasi sans perte, taille raisonnable pour 4 slides
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: img.naturalWidth,
      height: img.naturalHeight,
      thumbUsed,
    };
  } catch {
    return null; // canvas teinté (CORS) — on garde l'URL d'origine
  }
}
