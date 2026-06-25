"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/ui";

/**
 * Pipeline de contenu quotidien : montre combien de carrousels auto sont déjà
 * prêts aujourd'hui et permet de les générer à la demande en un clic (sans
 * dépendre du cron ni des notifications).
 */
export default function DailyContentBanner({ todayCount }: { todayCount: number }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function generate(force: boolean) {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/contenu/daily${force ? "?force=1" : ""}`, { method: "POST" });
      const data = await res
        .json()
        .catch(() => ({ ok: false, message: "Réponse invalide du serveur" }));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || `Génération impossible (${res.status})`);
      }
      setMsg(
        data.generated > 0
          ? `✓ ${data.generated} carrousels générés — dans la Bibliothèque`
          : "Le contenu du jour est déjà prêt dans la Bibliothèque"
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${colors.violet}22, ${colors.rose}18)`,
        border: `1px solid ${colors.violet}55`,
        borderRadius: 14,
        padding: "16px 18px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: colors.texte }}>
            🌅 Contenu du jour
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: colors.muted, lineHeight: 1.5 }}>
            {todayCount > 0
              ? `${todayCount} carrousel${todayCount > 1 ? "s" : ""} prêt${todayCount > 1 ? "s" : ""} aujourd'hui — déjà dans la Bibliothèque.`
              : "Génère en un clic 3 carrousels de restos tendance, textes + photos inclus."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => generate(false)}
            disabled={loading}
            style={{
              background: `linear-gradient(90deg, ${colors.violet}, ${colors.rose})`,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Génération…" : todayCount > 0 ? "↻ Régénérer" : "✨ Générer le contenu du jour"}
          </button>
          {todayCount > 0 && (
            <button
              onClick={() => generate(true)}
              disabled={loading}
              title="Remplace le lot du jour par 3 nouveaux restaurants"
              style={{
                background: "transparent",
                color: colors.violet,
                border: `1px solid ${colors.violet}66`,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              Nouveaux restos
            </button>
          )}
        </div>
      </div>
      {msg && <p style={{ margin: "10px 0 0", fontSize: 12, color: colors.vert }}>{msg}</p>}
      {err && <p style={{ margin: "10px 0 0", fontSize: 12, color: colors.rouge }}>⚠️ {err}</p>}
    </div>
  );
}
