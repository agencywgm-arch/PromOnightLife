"use client";

import { useState, useTransition } from "react";
import { saveAgentConfig, testAgentConfig } from "@/lib/actions";
import { card, input, btnPrimary, btnGhost, colors } from "@/lib/ui";

type AgentDef = {
  agentId: string;
  nom: string;
  description: string;
  fields: { key: string; label: string; type?: string }[];
};

const AGENTS: AgentDef[] = [
  {
    agentId: "manychat",
    nom: "Agent ManyChat",
    description:
      "Réception des candidatures via Instagram DM et synchronisation des statuts.",
    fields: [{ key: "apiKey", label: "Clé API ManyChat", type: "password" }],
  },
  {
    agentId: "meta",
    nom: "Agent Meta / Instagram",
    description: "Publication de contenu validé via l'API Graph de Meta.",
    fields: [
      { key: "accessToken", label: "Access token Meta", type: "password" },
      { key: "igUserId", label: "ID du compte Instagram" },
    ],
  },
];

type ConfigState = { agentId: string; active: boolean; values: Record<string, string> };

export default function AgentConfigPanel({
  initialConfigs,
}: {
  initialConfigs: ConfigState[];
}) {
  const [configs, setConfigs] = useState<Record<string, ConfigState>>(() => {
    const map: Record<string, ConfigState> = {};
    for (const a of AGENTS) {
      map[a.agentId] =
        initialConfigs.find((c) => c.agentId === a.agentId) ?? {
          agentId: a.agentId,
          active: false,
          values: {},
        };
    }
    return map;
  });
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [pending, startTransition] = useTransition();

  function update(agentId: string, patch: Partial<ConfigState>) {
    setConfigs((prev) => ({ ...prev, [agentId]: { ...prev[agentId], ...patch } }));
  }

  function save(agentId: string) {
    const c = configs[agentId];
    startTransition(async () => {
      await saveAgentConfig(agentId, c.active, c.values);
      setMessages((m) => ({ ...m, [agentId]: { ok: true, text: "Configuration enregistrée." } }));
    });
  }

  function test(agentId: string) {
    const c = configs[agentId];
    startTransition(async () => {
      const res = await testAgentConfig(agentId, c.values);
      setMessages((m) => ({ ...m, [agentId]: { ok: res.ok, text: res.message } }));
    });
  }

  return (
    <div style={card}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0 }}>Agents IA</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {AGENTS.map((agent) => {
          const c = configs[agent.agentId];
          const msg = messages[agent.agentId];
          return (
            <div
              key={agent.agentId}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <strong>{agent.nom}</strong>
                <label
                  style={{
                    fontSize: 12,
                    color: c.active ? colors.vert : colors.muted,
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={c.active}
                    onChange={(e) => update(agent.agentId, { active: e.target.checked })}
                  />
                  {c.active ? "Actif" : "Inactif"}
                </label>
              </div>
              <p style={{ color: colors.muted, fontSize: 13, marginTop: 0 }}>
                {agent.description}
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                {agent.fields.map((f) => (
                  <input
                    key={f.key}
                    type={f.type || "text"}
                    placeholder={f.label}
                    value={c.values[f.key] || ""}
                    onChange={(e) =>
                      update(agent.agentId, {
                        values: { ...c.values, [f.key]: e.target.value },
                      })
                    }
                    style={input}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  onClick={() => save(agent.agentId)}
                  disabled={pending}
                  style={{ ...btnPrimary, opacity: pending ? 0.6 : 1 }}
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => test(agent.agentId)}
                  disabled={pending}
                  style={{ ...btnGhost, opacity: pending ? 0.6 : 1 }}
                >
                  Tester la connexion
                </button>
              </div>
              {msg && (
                <p
                  style={{
                    fontSize: 13,
                    marginTop: 10,
                    marginBottom: 0,
                    color: msg.ok ? colors.vert : colors.rouge,
                  }}
                >
                  {msg.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
