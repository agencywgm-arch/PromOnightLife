"use client";

import { useState, useTransition, useRef } from "react";
import { createFaq, updateFaq, toggleFaq, deleteFaq } from "@/lib/actions";
import { ig, igCard, igInput } from "@/lib/igStyle";

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

  const fieldStyle = {
    ...igInput,
    width: "100%",
    borderRadius: 12,
    boxSizing: "border-box" as const,
    fontSize: 13,
    lineHeight: 1.45,
  };

  return (
    <div style={{ ...igCard, maxWidth: 460, margin: "0 auto" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: 16 }}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: ig.text }}>
            📚 Réponses de l&apos;agent
          </h2>
          <p style={{ fontSize: 12.5, color: ig.muted, margin: "4px 0 0", lineHeight: 1.4 }}>
            {faq.length} réponse{faq.length > 1 ? "s" : ""} — il ne répond seul
            qu&apos;aux questions couvertes ici.
          </p>
        </div>
        <span style={{ color: ig.muted }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          {/* Liste éditable */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {faq.map((f) => (
              <div
                key={f.id}
                style={{
                  border: `1px solid ${ig.border}`,
                  borderRadius: 14,
                  padding: 12,
                  background: f.enabled ? ig.elevated : "transparent",
                  opacity: f.enabled ? 1 : 0.5,
                }}
              >
                <input
                  value={f.question}
                  onChange={(e) => edit(f.id, "question", e.target.value)}
                  onBlur={() => save(f)}
                  placeholder="Question récurrente (ex: C'est vraiment gratuit ?)"
                  style={{ ...fieldStyle, fontWeight: 700, marginBottom: 6 }}
                />
                <textarea
                  value={f.answer}
                  onChange={(e) => edit(f.id, "answer", e.target.value)}
                  onBlur={() => save(f)}
                  placeholder="Réponse validée que l'agent enverra"
                  rows={2}
                  style={{ ...fieldStyle, resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 12, color: f.enabled ? ig.blue : ig.muted, display: "flex", gap: 6, alignItems: "center", cursor: "pointer", fontWeight: 600 }}>
                    <input type="checkbox" checked={f.enabled} onChange={(e) => toggle(f.id, e.target.checked)} style={{ accentColor: ig.blue }} />
                    {f.enabled ? "Active" : "Désactivée"}
                  </label>
                  <button
                    onClick={() => remove(f.id)}
                    style={{ background: "transparent", border: "none", color: ig.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ig.font, padding: 0 }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Ajout */}
          <form ref={formRef} action={add} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input name="question" placeholder="Nouvelle question récurrente" style={fieldStyle} required />
            <textarea name="answer" placeholder="Réponse que l'agent enverra" rows={2} style={{ ...fieldStyle, resize: "vertical" }} required />
            <button
              type="submit"
              style={{
                alignSelf: "flex-start",
                background: ig.blue,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: ig.font,
              }}
            >
              + Ajouter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
