"use client";

import { useEffect, useState } from "react";
import { colors, btnPrimary, btnGhost } from "@/lib/ui";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS expose navigator.standalone ; les autres via media query.
  return (
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function NotificationSettings({
  vapidPublicKey,
  pushConfigured,
}: {
  vapidPublicKey: string;
  pushConfigured: boolean;
}) {
  const [supported, setSupported] = useState(true);
  const [standalone, setStandalone] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [hour, setHour] = useState(9);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const sw = "serviceWorker" in navigator;
    const push = "PushManager" in window;
    setSupported(sw && push);
    setStandalone(isStandalone());
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if ("Notification" in window) setPermission(Notification.permission);

    // Vérifie un abonnement existant
    if (sw && push) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setSubscribed(true);
            setEndpoint(sub.endpoint);
          }
        })
        .catch(() => {});
    }
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMsg("Permission refusée. Active les notifications dans les réglages du téléphone.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), hour }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur abonnement");

      setSubscribed(true);
      setEndpoint(sub.endpoint);
      setMsg("✓ Notifications activées. Tu recevras 3 carrousels chaque jour.");
    } catch (e) {
      setMsg(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveHour(h: number) {
    setHour(h);
    if (!subscribed) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), hour: h }),
      });
      setMsg(`✓ Heure d'envoi : ${String(h).padStart(2, "0")}h`);
    } catch {
      /* ignore */
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setEndpoint(null);
      setMsg("Notifications désactivées.");
    } catch (e) {
      setMsg(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!endpoint) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMsg("✓ Notification de test envoyée — regarde ton écran !");
    } catch (e) {
      setMsg(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 18,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>🔔 Alertes quotidiennes</h2>
        <p style={{ fontSize: 13, color: colors.muted, margin: 0, lineHeight: 1.5 }}>
          Reçois chaque jour <strong style={{ color: colors.texte }}>3 carrousels prêts à publier</strong>,
          générés selon les critères du projet (restaurants parisiens haut de gamme).
        </p>
      </div>

      {/* Prérequis iOS : installer en PWA */}
      {isIOS && !standalone && (
        <div style={{ ...cardStyle, borderColor: `${colors.or}66`, background: "#1a1510" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: colors.or, margin: "0 0 6px" }}>
            📲 Étape requise sur iPhone
          </p>
          <p style={{ fontSize: 12.5, color: colors.muted, margin: 0, lineHeight: 1.6 }}>
            Les notifications iOS exigent d&apos;ajouter l&apos;app à l&apos;écran d&apos;accueil :
            appuie sur <strong style={{ color: colors.texte }}>Partager</strong> (carré avec flèche) →{" "}
            <strong style={{ color: colors.texte }}>Sur l&apos;écran d&apos;accueil</strong>, puis rouvre
            l&apos;app depuis l&apos;icône et reviens ici.
          </p>
        </div>
      )}

      {!pushConfigured && (
        <div style={{ ...cardStyle, borderColor: `${colors.violet}66` }}>
          <p style={{ fontSize: 12.5, color: colors.muted, margin: 0, lineHeight: 1.6 }}>
            ⚙️ Le serveur push n&apos;est pas encore configuré. Ajoute les clés{" "}
            <code style={{ color: colors.texte }}>VAPID_PRIVATE_KEY</code>,{" "}
            <code style={{ color: colors.texte }}>VAPID_PUBLIC_KEY</code> et{" "}
            <code style={{ color: colors.texte }}>CRON_SECRET</code> dans Vercel.
          </p>
        </div>
      )}

      {!supported ? (
        <div style={cardStyle}>
          <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>
            Ce navigateur ne supporte pas les notifications push. Sur iPhone, utilise Safari et
            installe l&apos;app sur l&apos;écran d&apos;accueil.
          </p>
        </div>
      ) : (
        <div style={cardStyle}>
          {/* Sélecteur d'heure */}
          <label style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>
            Heure de réception (Paris)
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              margin: "8px 0 16px",
            }}
          >
            {[7, 8, 9, 12, 14, 17].map((h) => (
              <button
                key={h}
                onClick={() => saveHour(h)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: `1px solid ${hour === h ? colors.violet : colors.border}`,
                  background: hour === h ? `${colors.violet}22` : "transparent",
                  color: hour === h ? colors.texte : colors.muted,
                }}
              >
                {String(h).padStart(2, "0")}h
              </button>
            ))}
          </div>

          {!subscribed ? (
            <button
              onClick={enable}
              disabled={busy || (isIOS && !standalone)}
              style={{
                ...btnPrimary,
                width: "100%",
                padding: "14px",
                fontSize: 15,
                opacity: busy || (isIOS && !standalone) ? 0.5 : 1,
              }}
            >
              {busy ? "…" : "🔔 Activer les notifications"}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: colors.vert,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: colors.vert,
                    display: "inline-block",
                  }}
                />
                Notifications actives — chaque jour à {String(hour).padStart(2, "0")}h
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={sendTest} disabled={busy} style={{ ...btnGhost, flex: 1 }}>
                  Tester maintenant
                </button>
                <button
                  onClick={disable}
                  disabled={busy}
                  style={{ ...btnGhost, flex: 1, color: colors.rouge, borderColor: `${colors.rouge}55` }}
                >
                  Désactiver
                </button>
              </div>
            </div>
          )}

          {msg && (
            <p
              style={{
                fontSize: 12.5,
                margin: "12px 0 0",
                color: msg.startsWith("✓") ? colors.vert : colors.muted,
                lineHeight: 1.5,
              }}
            >
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
