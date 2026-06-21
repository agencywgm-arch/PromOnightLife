"use client";

import { useState, useTransition } from "react";
import { saveAgentConfig } from "@/lib/actions";
import { card, input, btnPrimary, colors } from "@/lib/ui";

/**
 * Interrupteur global de l'agent de réponse automatique aux DM + contexte
 * métier passé à l'agent. Stocké dans AgentConfig("dm-agent").
 */
export default function DmAgentToggle({
  active,
  contexte,
  hasAnthropic,
}: {
  active: boolean;
  contexte: string;
  hasAnthropic: boolean;
}) {
  const [isActive, setIsActive] = useState(active);
  const [ctx, setCtx] = useState(contexte);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function persist(nextActive: boolean, nextCtx: string) {
    startTransition(async () => {
      await saveAgentConfig("dm-agent", nextActive, { contexte: nextCtx });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div style={{ ...card, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🤖 Agent de réponse automatique</h2>
          <p style={{ fontSize: 13, color: colors.muted, margin: "4px 0 0" }}>
            Répond seul aux questions récurrentes, escalade le reste en « à traiter ».
          </p>
        </div>
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 13,
            fontWeight: 700,
            color: isActive ? colors.vert : colors.muted,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => {
              setIsActive(e.target.checked);
              persist(e.target.checked, ctx);
            }}
          />
          {isActive ? "Activé" : "Désactivé"}
        </label>
      </div>

      {!hasAnthropic && (
        <p style={{ fontSize: 12, color: colors.or, margin: "10px 0 0" }}>
          ⚠️ ANTHROPIC_API_KEY manquante dans Vercel — l&apos;agent ne pourra pas générer de réponses.
        </p>
      )}

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 12, color: colors.muted, display: "block", marginBottom: 4 }}>
          Contexte donné à l&apos;agent (ton, infos générales, ce qu&apos;il peut dire)
        </label>
        <textarea
          value={ctx}
          onChange={(e) => setCtx(e.target.value)}
          onBlur={() => persist(isActive, ctx)}
          rows={3}
          placeholder="Ex: Collectif de soirées privées chic à Paris. On accueille avec bienveillance, on tutoie, on ne promet jamais une place. Pour s'inscrire : remplir le formulaire en bio."
          style={{ ...input, fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      {saved && <p style={{ fontSize: 12, color: colors.vert, margin: "8px 0 0" }}>✓ Enregistré</p>}
      {pending && <p style={{ fontSize: 12, color: colors.muted, margin: "8px 0 0" }}>Enregistrement…</p>}
    </div>
  );
}
