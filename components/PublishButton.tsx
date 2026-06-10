"use client";

import { useState, useTransition } from "react";
import { publishToInstagram } from "@/lib/actions";
import { btnPrimary, btnGhost, colors } from "@/lib/ui";

export default function PublishButton({
  contenuId,
  hasImages,
  hasMetaConfig,
}: {
  contenuId: string;
  hasImages: boolean;
  hasMetaConfig: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handlePublish() {
    startTransition(async () => {
      const res = await publishToInstagram(contenuId);
      setResult(res);
    });
  }

  if (result) {
    return (
      <span
        style={{
          fontSize: 11,
          padding: "5px 10px",
          borderRadius: 8,
          background: result.ok ? "#0d2a1a" : "#2a0d0d",
          color: result.ok ? "#4ade80" : colors.rouge,
          border: `1px solid ${result.ok ? "#4ade8055" : `${colors.rouge}55`}`,
        }}
      >
        {result.message}
      </span>
    );
  }

  if (!hasMetaConfig) {
    return (
      <span
        style={{
          fontSize: 11,
          padding: "5px 10px",
          borderRadius: 8,
          color: colors.muted,
          border: `1px solid ${colors.border}`,
        }}
        title="Configure META_ACCESS_TOKEN et META_IG_USER_ID dans Vercel"
      >
        Instagram non configuré
      </span>
    );
  }

  if (!hasImages) {
    return (
      <span
        style={{
          fontSize: 11,
          padding: "5px 10px",
          borderRadius: 8,
          color: colors.muted,
          border: `1px solid ${colors.border}`,
        }}
        title="Ré-génère les slides pour stocker les images"
      >
        Images manquantes
      </span>
    );
  }

  return (
    <button
      onClick={handlePublish}
      disabled={pending}
      style={{ ...btnPrimary, fontSize: 11, padding: "5px 10px", opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "Publication…" : "📤 Publier sur Instagram"}
    </button>
  );
}
