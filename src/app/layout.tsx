import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klassikern – Expeditionen",
  description: "Träna för En Svensk Klassiker. Tillsammans.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Klassikern – Expeditionen",
    description: "Träna för En Svensk Klassiker. Tillsammans.",
    locale: "sv_SE",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Klassikern",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
