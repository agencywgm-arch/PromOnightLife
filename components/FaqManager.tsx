"use client";

import { useState, useTransition, useRef } from "react";
import { createFaq, updateFaq, toggleFaq, deleteFaq } from "@/lib/actions";
import { card, input, btnPrimary, btnGhost, colors } from "@/lib/ui";

export type FaqDTO = {
  id: string;
  question: string;
  answer: string;
  enabled: boolean;
};

export default function FaqManager({ initialFaq }: { initialFaq: FaqDTO[] }) {
  const [faq, setFaq] = useState<FaqDTO[]>(initialFaq);
  const [open, setOpen] = useState(initialFaq.length === 0);
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();

  function add(formData: FormData) {
    const question = String(formData.get("question") || "").trim();
    const answer = String(formData.get("answer") || "").trim();
    if (!question || !answer) return;
    const optimistic: FaqDTO = { id: `tmp-${Date.now()}`, question, answer, enabled: true };
    setFaq((prev) => [...prev, optimistic]);
    formRef.current?.reset();
    startTransition(() => createFaq(formData));
  }

  function toggle(id: string, enabled: boolean) {
    setFaq((prev) => prev.map((f) => (f.id === id ? { ...f, enabled } : f)));
    startTransition(() => toggleFaq(id, enabled));
  }

  function remove(id: string) {
    setFaq((prev) => prev.filter((f) => f.id !== id));
    startTransition(() => deleteFaq(id));
  }

  function save(f: FaqDTO) {
    startTransition(() => updateFaq(f.id, f.question, f.answer));
  }

  function edit(id: string, field: "question" | "answer", value: string) {
    setFaq((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  }

  return (
    <div style={card}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            📚 Base de connaissances de l&apos;agent
          </h2>
          <p style={{ fontSize: 13, color: colors.muted, margin: "4px 0 0" }}>
            {faq.length} réponse{faq.length > 1 ? "s" : ""} — l&apos;agent ne répond automatiquement
            qu&apos;aux questions couvertes ici.
          </p>
        </div>
        <span style={{ color: colors.muted }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>
          {/* Liste éditable */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {faq.map((f) => (
              <div
                key={f.id}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: 12,
                  background: f.enabled ? colors.bg : "transparent",
                  opacity: f.enabled ? 1 : 0.55,
                }}
              >
                <input
                  value={f.question}
                  onChange={(e) => edit(f.id, "question", e.target.value)}
                  onBlur={() => save(f)}
                  placeholder="Question récurrente (ex: C'est quoi le dress code ?)"
                  style={{ ...input, fontSize: 13, fontWeight: 600, marginBottom: 6 }}
                />
                <textarea
                  value={f.answer}
                  onChange={(e) => edit(f.id, "answer", e.target.value)}
                  onBlur={() => save(f)}
                  placeholder="Réponse validée que l'agent enverra"
                  rows={2}
                  style={{ ...input, fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 12, color: f.enabled ? colors.vert : colors.muted, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={f.enabled} onChange={(e) => toggle(f.id, e.target.checked)} />
                    {f.enabled ? "Active" : "Désactivée"}
                  </label>
                  <button onClick={() => remove(f.id)} style={{ ...btnGhost, fontSize: 11, padding: "4px 10px", color: colors.rouge, borderColor: `${colors.rouge}55` }}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Ajout */}
          <form ref={formRef} action={add} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input name="question" placeholder="Nouvelle question récurrente" style={{ ...input, fontSize: 13 }} required />
            <textarea name="answer" placeholder="Réponse que l'agent enverra" rows={2} style={{ ...input, fontSize: 13, resize: "vertical", fontFamily: "inherit" }} required />
            <button type="submit" style={{ ...btnPrimary, alignSelf: "flex-start", fontSize: 13 }}>
              + Ajouter à la base
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
