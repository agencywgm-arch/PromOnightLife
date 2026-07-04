"use client";

import { useState, useRef, useEffect } from "react";
import { colors } from "@/lib/ui";

type Msg =
  | { role: "girl"; text: string }
  | { role: "agent"; text: string; confidence: number }
  | { role: "system"; text: string };

/**
 * Bac à sable style DM Instagram : le promoteur écrit comme une abonnée et voit
 * en direct comment l'agent réagirait, pour le calibrer (FAQ + contexte).
 * N'affecte aucune vraie conversation.
 */
export default function AgentTester({ handle = "nightlife.paris" }: { handle?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages: Msg[] = [...messages, { role: "girl", text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    // Historique pour l'agent : uniquement les vrais échanges (girl=IN, agent=OUT).
    const history = nextMessages
      .filter((m): m is Extract<Msg, { role: "girl" | "agent" }> => m.role === "girl" || m.role === "agent")
      .map((m) => ({ direction: m.role === "girl" ? "IN" : "OUT", text: m.text }));

    try {
      const res = await fetch("/api/dm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      });
      const data = await res.json().catch(() => ({ ok: false, message: "Réponse invalide" }));
      if (!res.ok || !data?.ok) {
        setMessages((m) => [...m, { role: "system", text: `⚠️ ${data?.message || `Erreur (${res.status})`}` }]);
        return;
      }
      const d = data.decision as { shouldReply: boolean; reply: string; reason: string; confidence: number };
      if (d.shouldReply && d.reply) {
        setMessages((m) => [...m, { role: "agent", text: d.reply, confidence: d.confidence }]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "system", text: `🙈 L'agent ne répondrait pas seul — passe en humain · ${d.reason}` },
        ]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "system", text: `⚠️ ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setLoading(false);
    }
  }

  const IG_GRADIENT = "linear-gradient(135deg, #405DE6, #833AB4, #C13584, #E1306C)";

  return (
    <div
      style={{
        maxWidth: 460,
        margin: "0 auto",
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${colors.border}`,
        background: "#0d0d12",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }}
    >
      {/* Header façon Instagram */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderBottom: `1px solid ${colors.border}`,
          background: "#15151c",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            padding: 2,
            background: IG_GRADIENT,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "#0d0d12",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🌃
          </div>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{handle}</div>
          <div style={{ fontSize: 11, color: colors.vert }}>● Agent IA · mode test</div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            style={{
              background: "transparent",
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Fil de discussion */}
      <div
        ref={threadRef}
        style={{
          height: 380,
          overflowY: "auto",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", color: colors.muted, fontSize: 13, lineHeight: 1.6, padding: "0 24px" }}>
            Écris comme le ferait une abonnée<br />(ex: « c&apos;est quoi le dress code ? »)<br />
            et vois comment l&apos;agent répondrait.
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === "system") {
            return (
              <div key={i} style={{ alignSelf: "center", maxWidth: "90%", textAlign: "center" }}>
                <span style={{ fontSize: 11.5, color: colors.or || "#f5b83d", background: "#1c1710", padding: "6px 12px", borderRadius: 12, display: "inline-block", lineHeight: 1.4 }}>
                  {m.text}
                </span>
              </div>
            );
          }
          const isGirl = m.role === "girl";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isGirl ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "76%",
                  padding: "9px 13px",
                  borderRadius: 18,
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: "#fff",
                  background: isGirl ? IG_GRADIENT : "#2a2a32",
                  borderBottomRightRadius: isGirl ? 4 : 18,
                  borderBottomLeftRadius: isGirl ? 18 : 4,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 15px", borderRadius: 18, background: "#2a2a32", color: colors.muted, fontSize: 14 }}>
              …
            </div>
          </div>
        )}
      </div>

      {/* Barre de saisie */}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${colors.border}`, background: "#15151c" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message…"
          disabled={loading}
          style={{
            flex: 1,
            background: "#0d0d12",
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: "10px 14px",
            color: "#fff",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            background: IG_GRADIENT,
            color: "#fff",
            border: "none",
            borderRadius: 20,
            padding: "0 18px",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading || !input.trim() ? "default" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
