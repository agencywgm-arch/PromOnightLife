"use client";

import { useState, useTransition } from "react";
import { saveAgentConfig } from "@/lib/actions";
import { ig, igCard, igInput } from "@/lib/igStyle";

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
    <div style={{ ...igCard, maxWidth: 460, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: ig.text }}>🤖 Réponse automatique</h2>
          <p style={{ fontSize: 12.5, color: ig.muted, margin: "4px 0 0", lineHeight: 1.4 }}>
            Répond seul aux questions récurrentes, te laisse le reste.
          </p>
        </div>
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 13,
            fontWeight: 700,
            color: isActive ? ig.blue : ig.muted,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            style={{ accentColor: ig.blue, width: 16, height: 16 }}
            onChange={(e) => {
              setIsActive(e.target.checked);
              persist(e.target.checked, ctx);
            }}
          />
          {isActive ? "Activé" : "Désactivé"}
        </label>
      </div>

      {!hasAnthropic && (
        <p style={{ fontSize: 12, color: ig.danger, margin: "10px 0 0" }}>
          ⚠️ ANTHROPIC_API_KEY manquante dans Vercel — l&apos;agent ne pourra pas générer de réponses.
        </p>
      )}

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 12, color: ig.muted, display: "block", marginBottom: 6 }}>
          Contexte donné à l&apos;agent (ton, infos générales, ce qu&apos;il peut dire)
        </label>
        <textarea
          value={ctx}
          onChange={(e) => setCtx(e.target.value)}
          onBlur={() => persist(isActive, ctx)}
          rows={3}
          placeholder="Ex: J'invite des filles (avec une copine) à un dîner offert puis en soirée club sur notre table VIP…"
          style={{ ...igInput, width: "100%", borderRadius: 14, resize: "vertical", boxSizing: "border-box", fontSize: 13, lineHeight: 1.45 }}
        />
      </div>

      {saved && <p style={{ fontSize: 12, color: ig.blue, margin: "8px 0 0" }}>✓ Enregistré</p>}
      {pending && <p style={{ fontSize: 12, color: ig.muted, margin: "8px 0 0" }}>Enregistrement…</p>}
    </div>
  );
}
