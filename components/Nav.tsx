"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { colors } from "@/lib/ui";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/participants", label: "Participantes" },
  { href: "/messages", label: "Messages" },
  { href: "/evenements", label: "Événements" },
  { href: "/contenu", label: "Contenu" },
  { href: "/staff", label: "Staff" },
];

export default function Nav() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const current = window.scrollY;
      // Toujours visible si on est tout en haut
      if (current < 10) {
        setVisible(true);
      } else if (current > lastScrollY.current + 4) {
        // Scroll vers le bas → cache
        setVisible(false);
      } else if (current < lastScrollY.current - 4) {
        // Scroll vers le haut → montre
        setVisible(true);
      }
      lastScrollY.current = current;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10,10,15,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${colors.border}`,
        transform: visible ? "translateY(0)" : "translateY(-110%)",
        transition: "transform 0.25s ease",
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
