"use client";

import { useState, useTransition } from "react";
import {
  sendManualReply,
  toggleConversationAuto,
  setConversationStatus,
  markConversationRead,
  deleteConversation,
} from "@/lib/actions";
import { ig, igCard, igInput, igAvatar } from "@/lib/igStyle";

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

function displayName(c: ConversationDTO): string {
  return c.username ? c.username : c.name || "inconnue";
}

const AVATARS = ["💃", "✨", "🥂", "🖤", "🌙", "📸", "🎀", "🌹"];
function avatarFor(c: ConversationDTO): string {
  const key = c.username || c.name || c.id;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return AVATARS[Math.abs(h) % AVATARS.length];
}

export default function MessagesInbox({
  initialConversations,
}: {
  initialConversations: ConversationDTO[];
}) {
  const [convos, setConvos] = useState<ConversationDTO[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
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

  const needsHumanCount = convos.filter((c) => c.status === "NEEDS_HUMAN").length;

  if (convos.length === 0) {
    return (
      <div style={{ ...igCard, maxWidth: 460, margin: "0 auto", textAlign: "center", color: ig.muted, padding: "48px 24px", lineHeight: 1.6, fontSize: 14 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✉️</div>
        <div style={{ color: ig.text, fontWeight: 700, marginBottom: 4 }}>Tes messages</div>
        Aucune conversation pour l&apos;instant.
        <br />
        Branche ton flow ManyChat sur <code style={{ color: ig.text }}>/api/dm/webhook</code>.
      </div>
    );
  }

  /* ── Vue fil de discussion (plein cadre, comme IG) ── */
  if (active) {
    const av = igAvatar(34, avatarFor(active));
    return (
      <div style={{ ...igCard, maxWidth: 460, margin: "0 auto", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}>
        {/* En-tête conversation */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${ig.border}` }}>
          <button
            onClick={() => setActiveId(null)}
            style={{ background: "transparent", border: "none", color: ig.text, fontSize: 22, cursor: "pointer", padding: "0 4px 0 0", lineHeight: 1 }}
            aria-label="Retour"
          >
            ‹
          </button>
          <div style={av.ring}><div style={av.inner}>{av.emoji}</div></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: ig.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName(active)}
            </div>
            <div style={{ fontSize: 11, color: ig.muted }}>
              {active.status === "NEEDS_HUMAN" ? "⚠️ à traiter" : active.autoReply ? "agent actif" : "agent en pause"} · {active.channel}
            </div>
          </div>
          <label style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, color: active.autoReply ? ig.blue : ig.muted, cursor: "pointer", fontWeight: 600 }}>
            <input type="checkbox" checked={active.autoReply} onChange={(e) => toggleAuto(e.target.checked)} style={{ accentColor: ig.blue }} />
            Auto
          </label>
          <button
            onClick={() => changeStatus(active.status === "NEEDS_HUMAN" ? "OPEN" : "NEEDS_HUMAN")}
            title={active.status === "NEEDS_HUMAN" ? "Marquer traité" : "Marquer à traiter"}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}
          >
            {active.status === "NEEDS_HUMAN" ? "✅" : "🚩"}
          </button>
          <button onClick={remove} title="Supprimer" style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 2 }}>
            🗑️
          </button>
        </div>

        {/* Messages */}
        <div style={{ height: 400, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 3, background: ig.bg }}>
          {active.messages.map((m, i) => {
            const out = m.direction === "OUT";
            const prev = active.messages[i - 1];
            const grouped = prev && prev.direction === m.direction;
            return (
              <div key={m.id} style={{ alignSelf: out ? "flex-end" : "flex-start", maxWidth: "72%", marginTop: grouped ? 0 : 8 }}>
                <div
                  style={{
                    background: out ? ig.blue : ig.bubbleIn,
                    color: "#fff",
                    borderRadius: 22,
                    borderBottomRightRadius: out ? 6 : 22,
                    borderBottomLeftRadius: out ? 22 : 6,
                    padding: "9px 13px",
                    fontSize: 14,
                    lineHeight: 1.4,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    opacity: m.status === "FAILED" ? 0.55 : 1,
                    border: m.status === "FAILED" ? `1px solid ${ig.danger}` : "none",
                  }}
                >
                  {m.text}
                </div>
                <div style={{ fontSize: 10, color: ig.muted, marginTop: 2, textAlign: out ? "right" : "left", padding: "0 4px" }}>
                  {m.viaAgent && "🤖 · "}
                  {m.status === "FAILED" && `⚠️ échec · `}
                  {timeLabel(m.createdAt)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Saisie */}
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${ig.border}` }}>
          {feedback && !feedback.ok && (
            <p style={{ fontSize: 12, color: ig.danger, margin: "0 0 8px" }}>⚠️ {feedback.text}</p>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Message…"
              style={{ ...igInput, flex: 1 }}
            />
            <button
              onClick={send}
              disabled={pending || !draft.trim()}
              style={{
                background: "transparent",
                border: "none",
                color: ig.blue,
                fontWeight: 700,
                fontSize: 14,
                cursor: pending || !draft.trim() ? "default" : "pointer",
                opacity: pending || !draft.trim() ? 0.4 : 1,
                fontFamily: ig.font,
              }}
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Vue liste (boîte de réception IG) ── */
  return (
    <div style={{ ...igCard, maxWidth: 460, margin: "0 auto", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}>
      {/* En-tête + onglets façon IG */}
      <div style={{ padding: "14px 16px 0", borderBottom: `1px solid ${ig.border}` }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Messages</div>
        <div style={{ display: "flex", gap: 24 }}>
          {(["ALL", "NEEDS_HUMAN"] as const).map((f) => {
            const activeTab = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab ? `2px solid ${ig.text}` : "2px solid transparent",
                  color: activeTab ? ig.text : ig.muted,
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "0 2px 10px",
                  cursor: "pointer",
                  fontFamily: ig.font,
                }}
              >
                {f === "ALL" ? "Principal" : `À traiter${needsHumanCount > 0 ? ` (${needsHumanCount})` : ""}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste */}
      <div style={{ maxHeight: 480, overflowY: "auto" }}>
        {list.length === 0 && (
          <p style={{ color: ig.muted, fontSize: 13, padding: 24, textAlign: "center" }}>Rien à traiter 🎉</p>
        )}
        {list.map((c) => {
          const last = c.messages[c.messages.length - 1];
          const unread = c.unread > 0;
          const av = igAvatar(52, avatarFor(c));
          return (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: ig.font,
              }}
            >
              <div style={av.ring}><div style={av.inner}>{av.emoji}</div></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: unread ? 800 : 600, fontSize: 14, color: ig.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {displayName(c)}
                  </span>
                  {c.status === "NEEDS_HUMAN" && <span style={{ fontSize: 11 }}>🚩</span>}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: unread ? ig.text : ig.muted,
                    fontWeight: unread ? 700 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {last?.direction === "OUT" ? "Toi : " : ""}
                  {last?.text || "…"}
                  <span style={{ color: ig.muted, fontWeight: 400 }}> · {timeLabel(c.lastAt)}</span>
                </div>
              </div>
              {unread && (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ig.blue, flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
