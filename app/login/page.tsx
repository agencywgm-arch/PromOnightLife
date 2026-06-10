import { loginAction } from "@/lib/actions";
import { card, input, btnPrimary, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: `radial-gradient(ellipse 60% 50% at 50% -10%, rgba(139,92,246,0.2), transparent)`,
      }}
    >
      <div style={{ ...card, width: 380, padding: 32 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            marginBottom: 4,
            background: `linear-gradient(90deg, ${colors.violet}, ${colors.rose})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          NIGHTLIFE PARIS
        </h1>
        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 24 }}>
          Connexion promoteur
        </p>
        {searchParams.error && (
          <p
            style={{
              color: colors.rouge,
              fontSize: 13,
              marginBottom: 16,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            Email ou mot de passe incorrect.
          </p>
        )}
        <form action={loginAction} style={{ display: "grid", gap: 14 }}>
          <input name="email" type="email" placeholder="Email" required style={input} />
          <input
            name="password"
            type="password"
            placeholder="Mot de passe"
            required
            style={input}
          />
          <button type="submit" style={btnPrimary}>
            Se connecter
          </button>
        </form>
        <p style={{ color: colors.muted, fontSize: 12, marginTop: 18 }}>
          Démo : promoteur@nightlife-paris.fr / nightlife2026
        </p>
      </div>
    </main>
  );
}
