"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors } from "@/lib/ui";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/participants", label: "Participantes" },
  { href: "/evenements", label: "Événements" },
  { href: "/contenu", label: "Contenu" },
  { href: "/staff", label: "Staff" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10,10,15,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            fontWeight: 800,
            fontSize: 17,
            letterSpacing: -0.5,
            background: `linear-gradient(90deg, ${colors.violet}, ${colors.rose})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            textDecoration: "none",
          }}
        >
          NIGHTLIFE PARIS
        </Link>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                color: pathname?.startsWith(l.href) ? colors.texte : colors.muted,
                borderBottom: pathname?.startsWith(l.href)
                  ? `2px solid ${colors.violet}`
                  : "2px solid transparent",
                paddingBottom: 2,
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
