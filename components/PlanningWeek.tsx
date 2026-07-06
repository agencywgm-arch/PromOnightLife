"use client";

import { useState, useTransition } from "react";
import { saveAgentConfig } from "@/lib/actions";
import { ig, igCard, igInput } from "@/lib/igStyle";
import type { DayPlan } from "@/lib/planning";

/**
 * Emploi du temps hebdo des soirées (club + before dîner par jour), affiché
 * dans le volet Messages pour répondre d'un coup d'œil aux « il y a quoi ce
 * soir ? ». Éditable sur place ; la version éditée est aussi celle que lit
 * l'agent DM. Le jour actuel est mis en avant.
 */
export default function PlanningWeek({
  initialDays,
  today,
}: {
  initialDays: DayPlan[];
  today: string;
}) {
  const [days, setDays] = useState<DayPlan[]>(initialDays);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function edit(i: number, field: "club" | "dinner", value: string) {
    setDays((prev) => prev.map((d, j) => (j === i ? { ...d, [field]: value } : d)));
  }

  function save() {
    setEditing(false);
    startTransition(async () => {
      await saveAgentConfig("planning", true, { data: JSON.stringify(days) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div style={{ ...igCard, maxWidth: 460, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${ig.border}` }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: ig.text }}>🗓️ Soirées de la semaine</h2>
          <p style={{ fontSize: 12, color: ig.muted, margin: "3px 0 0" }}>
            Ce que l&apos;agent connaît quand on lui demande « il y a quoi ce soir ? »
          </p>
        </div>
        <button
          onClick={() => (editing ? save() : setEditing(true))}
          style={{
            background: "transparent",
            border: "none",
            color: ig.blue,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: ig.font,
            flexShrink: 0,
          }}
        >
          {editing ? "Enregistrer" : "Modifier"}
        </button>
      </div>

      <div>
        {days.map((d, i) => {
          const isToday = d.day === today;
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
