"use client";

import { useState, useTransition } from "react";
import { saveAgentConfig } from "@/lib/actions";
import { ig, igCard, igInput } from "@/lib/igStyle";
import type { DayPlan } from "@/lib/planning";

type WeekInfo = { key: string; label: string; isCurrent: boolean };

/**
 * Emploi du temps des soirées, en deux niveaux :
 * - la « semaine type » récurrente (base par défaut) ;
 * - des semaines spécifiques que l'utilisateur remplit lui-même, semaine par
 *   semaine, pour adapter le programme (l'agent utilise automatiquement la
 *   semaine personnalisée si elle existe, sinon la semaine type).
 */
export default function PlanningWeek({
  initialDays,
  initialOverrides,
  weeks,
  today,
}: {
  initialDays: DayPlan[];
  initialOverrides: Record<string, DayPlan[]>;
  weeks: WeekInfo[];
  today: string;
}) {
  const [template, setTemplate] = useState<DayPlan[]>(initialDays);
  const [overrides, setOverrides] = useState<Record<string, DayPlan[]>>(initialOverrides);
  const [selected, setSelected] = useState<"template" | string>("template");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const isTemplate = selected === "template";
  const override = isTemplate ? undefined : overrides[selected];
  const days: DayPlan[] = isTemplate ? template : override ?? template;
  const selectedWeek = weeks.find((w) => w.key === selected);
  const showToday = isTemplate || selectedWeek?.isCurrent;

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function persistTemplate(next: DayPlan[]) {
    startTransition(async () => {
      await saveAgentConfig("planning", true, { data: JSON.stringify(next) });
      flash();
    });
  }

  function persistOverrides(next: Record<string, DayPlan[]>) {
    startTransition(async () => {
      await saveAgentConfig("planning-weeks", true, { data: JSON.stringify(next) });
      flash();
    });
  }

  function edit(i: number, field: "club" | "dinner", value: string) {
    if (isTemplate) {
      setTemplate((prev) => prev.map((d, j) => (j === i ? { ...d, [field]: value } : d)));
    } else {
      setOverrides((prev) => {
        const week = (prev[selected] ?? template).map((d, j) =>
          j === i ? { ...d, [field]: value } : d
        );
        return { ...prev, [selected]: week };
      });
    }
  }

  function save() {
    setEditing(false);
    if (isTemplate) persistTemplate(template);
    else persistOverrides({ ...overrides, [selected]: overrides[selected] ?? template });
  }

  function customizeWeek() {
    // Copie la semaine type comme point de départ, puis passe en édition.
    setOverrides((prev) => ({ ...prev, [selected]: template.map((d) => ({ ...d })) }));
    setEditing(true);
  }

  function resetWeek() {
    if (!confirm("Revenir à la semaine type pour cette semaine ?")) return;
    setEditing(false);
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[selected];
      persistOverrides(next);
      return next;
    });
  }

  return (
    <div style={{ ...igCard, maxWidth: 460, margin: "0 auto" }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: ig.text }}>🗓️ Soirées</h2>
          <p style={{ fontSize: 12, color: ig.muted, margin: "3px 0 0" }}>
            Ce que l&apos;agent connaît quand on lui demande « il y a quoi ce soir ? »
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          {!isTemplate && override && !editing && (
            <button
              onClick={resetWeek}
              style={{ background: "transparent", border: "none", color: ig.muted, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: ig.font }}
            >
              Réinitialiser
            </button>
          )}
          {(isTemplate || override) && (
            <button
              onClick={() => (editing ? save() : setEditing(true))}
              style={{ background: "transparent", border: "none", color: ig.blue, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: ig.font }}
            >
              {editing ? "Enregistrer" : "Modifier"}
            </button>
          )}
        </div>
      </div>

      {/* Sélecteur semaine type / semaines à venir */}
      <div style={{ display: "flex", gap: 6, padding: "0 12px 12px", overflowX: "auto", WebkitOverflowScrolling: "touch", borderBottom: `1px solid ${ig.border}` }}>
        {[{ key: "template" as const, label: "🔁 Semaine type", isCurrent: false }, ...weeks].map((w) => {
          const active = selected === w.key;
          const hasOverride = w.key !== "template" && !!overrides[w.key];
          return (
            <button
              key={w.key}
              onClick={() => {
                setSelected(w.key);
                setEditing(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${active ? ig.text : ig.border}`,
                background: active ? ig.text : "transparent",
                color: active ? "#000" : ig.muted,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                fontFamily: ig.font,
              }}
            >
              {w.key === "template" ? w.label : `Sem. ${w.label}`}
              {w.isCurrent && <span style={{ fontSize: 9, fontWeight: 800, color: active ? "#000" : ig.blue }}>• en cours</span>}
              {hasOverride && <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#000" : ig.blue, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Semaine non personnalisée : hérite de la semaine type */}
      {!isTemplate && !override && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 16px", background: ig.elevated, borderBottom: `1px solid ${ig.border}` }}>
          <span style={{ fontSize: 12, color: ig.muted }}>
            Cette semaine suit la semaine type.
          </span>
          <button
            onClick={customizeWeek}
            style={{ background: ig.blue, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ig.font, flexShrink: 0 }}
          >
            ✏️ Personnaliser
          </button>
        </div>
      )}

      {/* Jours */}
      <div>
        {days.map((d, i) => {
          const isToday = showToday && d.day === today;
          const off = !d.club && !d.dinner;
          return (
            <div
              key={d.day}
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 16px",
                borderBottom: i < days.length - 1 ? `1px solid ${ig.border}` : "none",
                background: isToday ? ig.elevated : "transparent",
                opacity: !isTemplate && !override ? 0.65 : 1,
              }}
            >
              <div style={{ width: 74, flexShrink: 0, paddingTop: 1 }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? ig.blue : ig.text }}>
                  {d.day}
                </span>
                {isToday && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: ig.blue, marginTop: 1 }}>ce soir</div>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                {editing ? (
                  <>
                    <input
                      value={d.club}
                      onChange={(e) => edit(i, "club", e.target.value)}
                      placeholder="🪩 Soirée / club (vide = pas de soirée)"
                      style={{ ...igInput, borderRadius: 10, padding: "6px 10px", fontSize: 12.5 }}
                    />
                    <input
                      value={d.dinner}
                      onChange={(e) => edit(i, "dinner", e.target.value)}
                      placeholder="🍽️ Before dîner (optionnel)"
                      style={{ ...igInput, borderRadius: 10, padding: "6px 10px", fontSize: 12.5 }}
                    />
                  </>
                ) : off ? (
                  <span style={{ fontSize: 13, color: ig.muted }}>— pas de soirée</span>
                ) : (
                  <>
                    {d.club && (
                      <span style={{ fontSize: 13, color: ig.text, lineHeight: 1.4, wordBreak: "break-word" }}>
                        🪩 {d.club}
                      </span>
                    )}
                    {d.dinner && (
                      <span style={{ fontSize: 12.5, color: ig.muted, lineHeight: 1.4, wordBreak: "break-word" }}>
                        🍽️ {d.dinner}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(saved || pending) && (
        <p style={{ fontSize: 12, color: saved ? ig.blue : ig.muted, margin: 0, padding: "8px 16px 12px" }}>
          {saved ? "✓ Enregistré — l'agent utilise ce planning" : "Enregistrement…"}
        </p>
      )}
    </div>
  );
}
