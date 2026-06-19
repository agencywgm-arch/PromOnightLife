import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "NIGHTLIFE PARIS — Carrousels",
  description: "Générateur de carrousels TikTok pour restaurants parisiens haut de gamme",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nightlife",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // gère les encoches iOS (safe areas)
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
          minHeight: "100dvh",
          WebkitTextSizeAdjust: "100%",
        }}
      >
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
