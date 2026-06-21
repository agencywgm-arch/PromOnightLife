"use client";

import { useState, useTransition } from "react";
import {
  sendManualReply,
  toggleConversationAuto,
  setConversationStatus,
  markConversationRead,
  deleteConversation,
} from "@/lib/actions";
import { card, input, btnPrimary, btnGhost, colors } from "@/lib/ui";

export type MessageDTO = {
  id: string;
  direction: "IN" | "OUT";
  text: string;
  viaAgent: boolean;
  status: string;
  createdAt: string;
};

export type ConversationDTO = {
  id: string;
  channel: string;
  username: string | null;
  name: string | null;
  status: string;
  autoReply: boolean;
  unread: number;
  lastAt: string;
  messages: MessageDTO[];
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: string): { label: string; color: string } {
  if (status === "NEEDS_HUMAN") return { label: "À traiter", color: colors.or };
  if (status === "CLOSED") return { label: "Fermée", color: colors.muted };
  return { label: "Ouverte", color: colors.vert };
}

export default function MessagesInbox({
  initialConversations,
}: {
  initialConversations: ConversationDTO[];
}) {
  const [convos, setConvos] = useState<ConversationDTO[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations.find((c) => c.status === "NEEDS_HUMAN")?.id ||
      initialConversations[0]?.id ||
      null
  );
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"ALL" | "NEEDS_HUMAN">("ALL");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const active = convos.find((c) => c.id === activeId) || null;
  const list = filter === "NEEDS_HUMAN" ? convos.filter((c) => c.status === "NEEDS_HUMAN") : convos;

  function openConversation(id: string) {
    setActiveId(id);
    setDraft("");
    setFeedback(null);
    const convo = convos.find((c) => c.id === id);
    if (convo && convo.unread > 0) {
      setConvos((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
      startTransition(() => markConversationRead(id));
    }
  }

  function send() {
    if (!active || !draft.trim()) return;
    const text = draft.trim();
    const optimistic: MessageDTO = {
      id: `tmp-${Date.now()}`,
      direction: "OUT",
      text,
      viaAgent: false,
      status: "SENT",
      createdAt: new Date().toISOString(),
    };
    setConvos((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? { ...c, messages: [...c.messages, optimistic], status: "OPEN", lastAt: optimistic.createdAt }
          : c
      )
    );
    setDraft("");
    startTransition(async () => {
      const res = await sendManualReply(active.id, text);
      setFeedback(res.ok ? null : { ok: false, text: res.message });
      if (!res.ok) {
        // marque le message envoyé comme échoué
        setConvos((prev) =>
          prev.map((c) =>
            c.id === active.id
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === optimistic.id ? { ...m, status: "FAILED" } : m
                  ),
                }
              : c
          )
        );
      }
    });
  }

  function toggleAuto(checked: boolean) {
    if (!active) return;
    setConvos((prev) => prev.map((c) => (c.id === active.id ? { ...c, autoReply: checked } : c)));
    startTransition(() => toggleConversationAuto(active.id, checked));
  }

  function changeStatus(status: string) {
    if (!active) return;
    setConvos((prev) => prev.map((c) => (c.id === active.id ? { ...c, status } : c)));
    startTransition(() => setConversationStatus(active.id, status));
  }

  function remove() {
    if (!active) return;
    if (!confirm("Supprimer cette conversation ?")) return;
    const id = active.id;
    setConvos((prev) => prev.filter((c) => c.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
    startTransition(() => deleteConversation(id));
  }

  if (convos.length === 0) {
    return (
      <div style={{ ...card, marginBottom: 24, textAlign: "center", color: colors.muted, padding: "40px 20px", lineHeight: 1.6 }}>
        Aucune conversation pour l&apos;instant.
        <br />
        Branche ton flow ManyChat sur le webhook <code style={{ color: colors.texte }}>/api/dm/webhook</code> pour
        voir arriver les DM ici.
      </div>
    );
  }

  return (
    <div style={{ ...card, marginBottom: 24, padding: 0, overflow: "hidden" }}>
      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, padding: 12, borderBottom: `1px solid ${colors.border}` }}>
        {(["ALL", "NEEDS_HUMAN"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...btnGhost,
              fontSize: 12,
              padding: "6px 12px",
              ...(filter === f
                ? { borderColor: colors.violet, color: colors.violet, background: `${colors.violet}14` }
                : {}),
            }}
          >
            {f === "ALL" ? "Toutes" : "À traiter"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", minHeight: 420, flexWrap: "wrap" }}>
        {/* Liste des conversations */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            borderRight: `1px solid ${colors.border}`,
            maxHeight: 560,
            overflowY: "auto",
          }}
        >
          {list.length === 0 && (
            <p style={{ color: colors.muted, fontSize: 13, padding: 16, textAlign: "center" }}>
              Rien à traiter 🎉
            </p>
          )}
          {list.map((c) => {
            const sb = statusBadge(c.status);
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: isActive ? colors.cardHover : "transparent",
                  border: "none",
                  borderBottom: `1px solid ${colors.border}`,
                  borderLeft: isActive ? `3px solid ${colors.violet}` : "3px solid transparent",
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, color: colors.texte, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.username ? `@${c.username}` : c.name || "Inconnue"}
                  </span>
                  {c.unread > 0 && (
                    <span style={{ background: colors.rose, color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "1px 6px", flexShrink: 0 }}>
                      {c.unread}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3, gap: 6 }}>
                  <span style={{ fontSize: 11, color: colors.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.messages[c.messages.length - 1]?.direction === "OUT" ? "↩ " : ""}
                    {c.messages[c.messages.length - 1]?.text || "…"}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: sb.color, flexShrink: 0 }}>{sb.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Fil de discussion */}
        <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column" }}>
          {!active ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: colors.muted, fontSize: 13 }}>
              Choisis une conversation
            </div>
          ) : (
            <>
              {/* En-tête conversation */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, color: colors.texte }}>
                    {active.username ? `@${active.username}` : active.name || "Inconnue"}
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted }}>
                    via {active.channel} · {timeLabel(active.lastAt)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: active.autoReply ? colors.vert : colors.muted, cursor: "pointer" }}>
                    <input type="checkbox" checked={active.autoReply} onChange={(e) => toggleAuto(e.target.checked)} />
                    Agent auto
                  </label>
                  {active.status === "NEEDS_HUMAN" ? (
                    <button onClick={() => changeStatus("OPEN")} style={{ ...btnGhost, fontSize: 11, padding: "5px 10px" }}>
                      Marquer traité
                    </button>
                  ) : (
                    <button onClick={() => changeStatus("NEEDS_HUMAN")} style={{ ...btnGhost, fontSize: 11, padding: "5px 10px" }}>
                      À traiter
                    </button>
                  )}
                  <button onClick={remove} style={{ ...btnGhost, fontSize: 11, padding: "5px 10px", color: colors.rouge, borderColor: `${colors.rouge}55` }}>
                    Suppr.
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 380 }}>
                {active.messages.map((m) => {
                  const out = m.direction === "OUT";
                  return (
                    <div key={m.id} style={{ alignSelf: out ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                      <div
                        style={{
                          background: out ? `linear-gradient(135deg, ${colors.violetDark}, ${colors.rose})` : colors.cardHover,
                          color: out ? "#fff" : colors.texte,
                          borderRadius: 14,
                          padding: "8px 12px",
                          fontSize: 13,
                          lineHeight: 1.4,
                          whiteSpace: "pre-wrap",
                          opacity: m.status === "FAILED" ? 0.6 : 1,
                          border: m.status === "FAILED" ? `1px solid ${colors.rouge}` : "none",
                        }}
                      >
                        {m.text}
                      </div>
                      <div style={{ fontSize: 9, color: colors.muted, marginTop: 2, textAlign: out ? "right" : "left" }}>
                        {m.viaAgent && "🤖 agent · "}
                        {m.status === "FAILED" && "⚠️ échec · "}
                        {timeLabel(m.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Saisie */}
              <div style={{ padding: 12, borderTop: `1px solid ${colors.border}` }}>
                {feedback && !feedback.ok && (
                  <p style={{ fontSize: 12, color: colors.rouge, margin: "0 0 8px" }}>⚠️ {feedback.text}</p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="Écris une réponse…"
                    style={{ ...input, flex: 1 }}
                  />
                  <button onClick={send} disabled={pending || !draft.trim()} style={{ ...btnPrimary, opacity: pending || !draft.trim() ? 0.5 : 1 }}>
                    Envoyer
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
