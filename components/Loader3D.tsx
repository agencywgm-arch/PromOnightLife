"use client";

/**
 * Loader « balade parisienne » — 100% CSS/SVG, aucune dépendance.
 * Une silhouette de femme marche (cycle de marche en stop-motion via steps())
 * pendant que les monuments de Paris défilent derrière elle en parallaxe,
 * sous un ciel de nuit dégradé. Pensé pour rester fluide sur mobile.
 *
 * Props : label, fullscreen, compact.
 */

export default function Loader3D({
  label = "Chargement",
  fullscreen = false,
  compact = false,
}: {
  label?: string;
  fullscreen?: boolean;
  compact?: boolean;
}) {
  const sceneW = compact ? 200 : 320;
  const sceneH = compact ? 120 : 200;

  return (
    <div
      style={{
        position: fullscreen ? "fixed" : "relative",
        inset: fullscreen ? 0 : undefined,
        zIndex: fullscreen ? 9999 : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 10 : 22,
        padding: compact ? 10 : 28,
        minHeight: fullscreen ? "100dvh" : compact ? 130 : 240,
        width: "100%",
        boxSizing: "border-box",
        background: fullscreen
          ? "linear-gradient(180deg,#1a1030 0%,#2a1646 45%,#3a1d4f 100%)"
          : "transparent",
      }}
    >
      <Keyframes />

      <div
        className="pw-scene"
        style={{ width: sceneW, height: sceneH, borderRadius: compact ? 14 : 22 }}
      >
        {/* Ciel + lune */}
        <div className="pw-moon" />
        {/* Étoiles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="pw-star"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 29) % 55}%`,
              animationDelay: `${(i % 6) * 0.5}s`,
            }}
          />
        ))}

        {/* Monuments lointains (parallaxe lente) */}
        <div className="pw-layer pw-far">
          <Skyline />
          <Skyline />
        </div>
        {/* Monuments proches (parallaxe rapide) */}
        <div className="pw-layer pw-near">
          <Skyline near />
          <Skyline near />
        </div>

        {/* Rue */}
        <div className="pw-street">
          <div className="pw-road-line" />
        </div>

        {/* La marcheuse */}
        <div className="pw-walker">
          <Walker />
        </div>
      </div>

      {label && (
        <div
          className="pw-label"
          style={{ fontSize: compact ? 12 : 15, fontWeight: 800, letterSpacing: 0.3 }}
        >
          {label}
          <span className="pw-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Skyline parisienne (silhouettes) ───────────────────────── */
function Skyline({ near = false }: { near?: boolean }) {
  const fill = near ? "#0e0820" : "#1d1138";
  return (
    <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="pw-svg">
      <g fill={fill}>
        {/* Tour Eiffel */}
        <rect x="68" y="20" width="3" height="22" />
        <path d="M69 40 C66 78 58 130 44 198 L58 198 C64 140 67 104 69 86 C71 104 74 140 80 198 L94 198 C80 130 72 78 69 40 Z" />
        <rect x="54" y="150" width="30" height="7" />
        <rect x="60" y="108" width="18" height="6" />
        {/* Arc de Triomphe */}
        <path
          fillRule="evenodd"
          d="M150 198 L150 138 Q150 120 172 120 Q194 120 194 138 L194 198 Z M164 198 L164 156 Q164 146 172 146 Q180 146 180 156 L180 198 Z"
        />
        {/* Immeuble haussmannien */}
        <rect x="220" y="120" width="60" height="78" />
        <polygon points="220,120 250,100 280,120" />
        {/* Dôme (Panthéon / Sacré-Cœur) */}
        <rect x="320" y="150" width="56" height="48" />
        <path d="M320 150 Q348 110 376 150 Z" />
        <rect x="346" y="96" width="4" height="20" />
        {/* Notre-Dame (deux tours) */}
        <rect x="420" y="130" width="16" height="68" />
        <rect x="446" y="130" width="16" height="68" />
        <rect x="436" y="146" width="10" height="52" />
        {/* Lampadaire + arbre */}
        <rect x="520" y="150" width="3" height="48" />
        <circle cx="521" cy="148" r="5" />
        <circle cx="560" cy="168" r="18" />
        <rect x="558" y="178" width="4" height="20" />
      </g>
    </svg>
  );
}

/* ── La marcheuse (cycle de marche stop-motion) ─────────────── */
function Walker() {
  return (
    <svg viewBox="0 0 80 150" className="pw-walker-svg">
      <defs>
        <linearGradient id="pwDress" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ec4899" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* Bras arrière */}
      <g className="pw-arm-back">
        <rect x="36" y="58" width="6" height="34" rx="3" fill="#6d28d9" />
      </g>
      {/* Jambe arrière */}
      <g className="pw-leg-back">
        <rect x="36" y="96" width="8" height="46" rx="4" fill="#3b2168" />
        <ellipse cx="40" cy="144" rx="8" ry="4" fill="#241344" />
      </g>
      {/* Jambe avant */}
      <g className="pw-leg-front">
        <rect x="36" y="96" width="8" height="46" rx="4" fill="#4c2a86" />
        <ellipse cx="40" cy="144" rx="9" ry="4" fill="#2e1a55" />
      </g>

      {/* Robe */}
      <polygon points="30,52 50,52 60,104 20,104" fill="url(#pwDress)" />
      {/* Buste */}
      <rect x="33" y="40" width="14" height="20" rx="6" fill="#ec4899" />
      {/* Tête + chevelure */}
      <circle cx="40" cy="22" r="10" fill="#f4d9c6" />
      <path d="M28 22 Q28 6 40 6 Q52 6 52 22 Q52 16 46 14 Q44 22 40 22 Q36 22 34 16 Q28 16 28 22 Z" fill="#2a1640" />

      {/* Bras avant */}
      <g className="pw-arm-front">
        <rect x="38" y="58" width="6" height="34" rx="3" fill="#f472b6" />
      </g>
    </svg>
  );
}

/* ── Keyframes & styles ─────────────────────────────────────── */
function Keyframes() {
  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
.pw-scene{position:relative;overflow:hidden;
  background:linear-gradient(180deg,#241046 0%,#3a1c52 55%,#5a2b54 100%);
  box-shadow:0 20px 60px rgba(0,0,0,0.5),inset 0 0 60px rgba(0,0,0,0.35);
  border:1px solid rgba(255,255,255,0.08)}
.pw-moon{position:absolute;top:14%;right:16%;width:38px;height:38px;border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#fff7e8,#ffd9a0);
  box-shadow:0 0 28px 8px rgba(255,220,160,0.55);animation:pwGlow 4s ease-in-out infinite}
.pw-star{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;
  opacity:.5;animation:pwTwinkle 2.6s ease-in-out infinite}
.pw-layer{position:absolute;left:0;bottom:14%;display:flex;width:200%;height:78%}
.pw-svg{width:50%;height:100%;flex:0 0 50%}
.pw-far{opacity:.55;animation:pwScroll 13s linear infinite}
.pw-near{opacity:.9;bottom:11%;height:70%;animation:pwScroll 7.5s linear infinite}
.pw-street{position:absolute;left:0;right:0;bottom:0;height:16%;
  background:linear-gradient(180deg,#1a0f2e,#0d0818)}
.pw-road-line{position:absolute;top:46%;left:0;width:200%;height:3px;
  background:repeating-linear-gradient(90deg,rgba(255,210,150,.5) 0 18px,transparent 18px 40px);
  animation:pwScroll 1.1s linear infinite}
.pw-walker{position:absolute;left:50%;bottom:9%;transform:translateX(-50%);
  height:54%;animation:pwBob .56s steps(2,jump-none) infinite}
.pw-walker-svg{height:100%;width:auto;filter:drop-shadow(0 6px 8px rgba(0,0,0,.45))}
.pw-leg-front{transform-box:fill-box;transform-origin:50% 0;animation:pwLegF .56s steps(3,jump-none) infinite}
.pw-leg-back{transform-box:fill-box;transform-origin:50% 0;animation:pwLegB .56s steps(3,jump-none) infinite}
.pw-arm-front{transform-box:fill-box;transform-origin:50% 0;animation:pwLegB .56s steps(3,jump-none) infinite}
.pw-arm-back{transform-box:fill-box;transform-origin:50% 0;animation:pwLegF .56s steps(3,jump-none) infinite}
.pw-label{background:linear-gradient(90deg,#f4c4dd,#ec4899,#a78bfa,#f4c4dd);background-size:300% auto;
  -webkit-background-clip:text;background-clip:text;color:transparent;text-align:center;
  animation:pwShimmer 3s linear infinite}
.pw-dots span{animation:pwBlink 1.4s infinite both}
.pw-dots span:nth-child(2){animation-delay:.2s}
.pw-dots span:nth-child(3){animation-delay:.4s}
@keyframes pwScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pwLegF{0%{transform:rotate(24deg)}50%{transform:rotate(-24deg)}100%{transform:rotate(24deg)}}
@keyframes pwLegB{0%{transform:rotate(-24deg)}50%{transform:rotate(24deg)}100%{transform:rotate(-24deg)}}
@keyframes pwBob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-3px)}}
@keyframes pwTwinkle{0%,100%{opacity:.2}50%{opacity:.9}}
@keyframes pwGlow{0%,100%{box-shadow:0 0 22px 6px rgba(255,220,160,.45)}50%{box-shadow:0 0 34px 12px rgba(255,220,160,.7)}}
@keyframes pwShimmer{to{background-position:300% center}}
@keyframes pwBlink{0%,100%{opacity:.2}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){
  .pw-far,.pw-near,.pw-road-line,.pw-walker,.pw-leg-front,.pw-leg-back,.pw-arm-front,.pw-arm-back{animation-duration:3s}
}
`,
      }}
    />
  );
}
