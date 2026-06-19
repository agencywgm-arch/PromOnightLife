"use client";

/**
 * Loader 3D immersif — 100% CSS (aucune dépendance, GPU-accéléré).
 * Un anneau de cartes « carrousel » tourne en 3D autour d'une Tour Eiffel
 * pulsée, avec des particules flottantes. Conçu pour rester fluide même
 * sur mobile (transforms composités uniquement).
 *
 * Props :
 *  - label : texte d'état affiché sous l'animation
 *  - fullscreen : overlay plein écran (sinon, s'intègre dans le flux)
 *  - compact : version réduite (recherche par slide, etc.)
 */

const CARDS = 7;
const PARTICLES = 14;

export default function Loader3D({
  label = "Chargement",
  fullscreen = false,
  compact = false,
}: {
  label?: string;
  fullscreen?: boolean;
  compact?: boolean;
}) {
  const scale = compact ? 0.55 : 1;

  return (
    <div
      className="l3d-root"
      style={{
        position: fullscreen ? "fixed" : "relative",
        inset: fullscreen ? 0 : undefined,
        zIndex: fullscreen ? 9999 : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 10 : 26,
        padding: compact ? 12 : 30,
        minHeight: fullscreen ? "100dvh" : compact ? 90 : 200,
        width: "100%",
        background: fullscreen
          ? "radial-gradient(ellipse 80% 55% at 50% 38%, rgba(139,92,246,0.40), rgba(26,16,48,0.96) 70%), linear-gradient(160deg,#1a1030,#0d0a18)"
          : "transparent",
        backdropFilter: fullscreen ? "blur(8px)" : undefined,
        WebkitBackdropFilter: fullscreen ? "blur(8px)" : undefined,
        overflow: "hidden",
      }}
    >
      <StyleOnce />

      <div
        className="l3d-stage"
        style={{ transform: `scale(${scale})`, width: 220, height: 220 }}
      >
        {/* Lueur de fond */}
        <div className="l3d-glow" />

        {/* Anneau de cartes en rotation 3D */}
        <div className="l3d-ring">
          {Array.from({ length: CARDS }).map((_, i) => (
            <div
              key={i}
              className="l3d-card"
              style={{
                transform: `rotateY(${(360 / CARDS) * i}deg) translateZ(118px)`,
                animationDelay: `${(i / CARDS) * -2}s`,
              }}
            />
          ))}
        </div>

        {/* Cœur : Tour Eiffel pulsée */}
        <div className="l3d-core">🗼</div>

        {/* Particules flottantes */}
        {Array.from({ length: PARTICLES }).map((_, i) => {
          const left = (i * 37) % 100;
          const delay = (i % 7) * 0.4;
          const dur = 2.8 + (i % 5) * 0.5;
          const size = 3 + (i % 3) * 2;
          return (
            <span
              key={i}
              className="l3d-particle"
              style={{
                left: `${left}%`,
                width: size,
                height: size,
                animationDelay: `${delay}s`,
                animationDuration: `${dur}s`,
              }}
            />
          );
        })}
      </div>

      {label && (
        <div
          className="l3d-label"
          style={{ fontSize: compact ? 12 : 15, fontWeight: 800, letterSpacing: 0.3 }}
        >
          {label}
          <span className="l3d-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      )}
    </div>
  );
}

/** Injecte les keyframes une seule fois (idempotent via id). */
function StyleOnce() {
  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
.l3d-stage{position:relative;transform-style:preserve-3d;display:flex;align-items:center;justify-content:center}
.l3d-glow{position:absolute;width:160px;height:160px;border-radius:50%;
  background:radial-gradient(circle,rgba(236,72,153,0.55),rgba(139,92,246,0.25) 55%,transparent 72%);
  filter:blur(14px);animation:l3dGlow 2.4s ease-in-out infinite}
.l3d-ring{position:absolute;width:120px;height:120px;transform-style:preserve-3d;
  animation:l3dSpin 3.4s linear infinite}
.l3d-card{position:absolute;left:50%;top:50%;width:46px;height:74px;margin:-37px 0 0 -23px;
  border-radius:9px;background:linear-gradient(150deg,#8b5cf6,#ec4899);
  box-shadow:0 0 18px rgba(236,72,153,0.55),inset 0 0 10px rgba(255,255,255,0.25);
  border:1px solid rgba(255,255,255,0.35);backface-visibility:hidden;
  animation:l3dCardPulse 2s ease-in-out infinite}
.l3d-core{position:absolute;font-size:40px;filter:drop-shadow(0 0 12px rgba(236,72,153,0.9));
  animation:l3dCore 2.4s ease-in-out infinite;z-index:2}
.l3d-particle{position:absolute;bottom:8%;border-radius:50%;
  background:radial-gradient(circle,#fff,rgba(236,72,153,0.8));
  box-shadow:0 0 8px rgba(236,72,153,0.9);opacity:0;
  animation-name:l3dFloat;animation-timing-function:ease-in;animation-iteration-count:infinite}
.l3d-label{background:linear-gradient(90deg,#a78bfa,#ec4899,#a78bfa);background-size:200% auto;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  animation:l3dShimmer 2.2s linear infinite;text-align:center}
.l3d-dots span{animation:l3dBlink 1.4s infinite both}
.l3d-dots span:nth-child(2){animation-delay:0.2s}
.l3d-dots span:nth-child(3){animation-delay:0.4s}
@keyframes l3dSpin{from{transform:rotateX(-18deg) rotateY(0)}to{transform:rotateX(-18deg) rotateY(360deg)}}
@keyframes l3dCardPulse{0%,100%{filter:brightness(0.8)}50%{filter:brightness(1.3)}}
@keyframes l3dCore{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.15) translateY(-3px)}}
@keyframes l3dGlow{0%,100%{opacity:0.6;transform:scale(0.92)}50%{opacity:1;transform:scale(1.08)}}
@keyframes l3dFloat{0%{opacity:0;transform:translateY(0) scale(0.6)}
  15%{opacity:1}100%{opacity:0;transform:translateY(-130px) scale(1.1)}}
@keyframes l3dShimmer{to{background-position:200% center}}
@keyframes l3dBlink{0%,100%{opacity:0.2}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){
  .l3d-ring,.l3d-core,.l3d-glow,.l3d-card,.l3d-particle,.l3d-label{animation-duration:6s}
}
`,
      }}
    />
  );
}
