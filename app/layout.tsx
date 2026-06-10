import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nightlife Paris — Dashboard promoteur",
  description: "Gestion d'événements nightlife parisiens",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          background: "#0a0a0f",
          color: "#e5e7eb",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
