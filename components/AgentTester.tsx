"use client";

import { useState, useRef, useEffect } from "react";
import { ig, igCard, igInput, igAvatar } from "@/lib/igStyle";

type Msg =
  | { role: "girl"; text: string }
  | { role: "agent"; text: string; confidence: number }
  | { role: "system"; text: string };

/**
 * Bac à sable style DM Instagram : le promoteur écrit comme une abonnée et voit
 * en direct comment l'agent réagirait, pour le calibrer (FAQ + contexte).
 * N'affecte aucune vraie conversation.
 */
export default function AgentTester({ handle = "guest_for_dinner" }: { handle?: string }) {
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

  const av = igAvatar(40, "🥂");

  return (
    <div style={{ ...igCard, maxWidth: 460, margin: "0 auto", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}>
      {/* En-tête façon conversation Instagram */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderBottom: `1px solid ${ig.border}`,
        }}
      >
        <div style={av.ring}><div style={av.inner}>{av.emoji}</div></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: ig.text }}>{handle}</div>
          <div style={{ fontSize: 11, color: ig.muted }}>Agent IA · mode test — tu joues l&apos;abonnée</div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            style={{
              background: "transparent",
              border: `1px solid ${ig.border}`,
              color: ig.muted,
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: ig.font,
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
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: ig.bg,
        }}
      >
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", color: ig.muted, fontSize: 13, lineHeight: 1.6, padding: "0 24px" }}>
            Écris comme le ferait une abonnée<br />(ex: « c&apos;est vraiment gratuit le dîner ? »)<br />
            et vois comment l&apos;agent répondrait.
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === "system") {
            return (
              <div key={i} style={{ alignSelf: "center", maxWidth: "90%", textAlign: "center" }}>
                <span style={{ fontSize: 11.5, color: ig.muted, background: ig.elevated, padding: "6px 12px", borderRadius: 12, display: "inline-block", lineHeight: 1.4 }}>
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
                  maxWidth: "72%",
                  padding: "9px 13px",
                  borderRadius: 22,
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: "#fff",
                  background: isGirl ? ig.blue : ig.bubbleIn,
                  borderBottomRightRadius: isGirl ? 6 : 22,
                  borderBottomLeftRadius: isGirl ? 22 : 6,
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
            <div style={{ padding: "10px 15px", borderRadius: 22, background: ig.bubbleIn, color: ig.muted, fontSize: 14 }}>
              …
            </div>
          </div>
        )}
      </div>

      {/* Barre de saisie */}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${ig.border}`, alignItems: "center" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message…"
          disabled={loading}
          style={{ ...igInput, flex: 1 }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            background: "transparent",
            border: "none",
            color: ig.blue,
            fontWeight: 700,
            fontSize: 14,
            cursor: loading || !input.trim() ? "default" : "pointer",
            opacity: loading || !input.trim() ? 0.4 : 1,
            fontFamily: ig.font,
          }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
