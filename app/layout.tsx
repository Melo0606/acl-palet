import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ACL Palet",
  description: "Gestion de tournoi de palet vendéen au système suisse — ACL Basket Longué",
  // Le logo du club sert aussi de favicon : un seul fichier a deposer.
  icons: { icon: "/logo_acl.jpg", apple: "/logo_acl.jpg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#131111" },
  ],
};

// Toutes les pages lisent la base a chaque requete : sans ceci, Next.js peut
// figer au build un HTML contenant les donnees d'un autre tournoi.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg text-text">
        <header className="no-print sticky top-0 z-10 border-b border-shell-border bg-shell text-shell-text">
          <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 md:px-8">
            <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
              {/* Logo ACL Basket Longue, fond blanc : la pastille blanche le
                  detache proprement du bandeau noir. */}
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                <Image src="/logo_acl.jpg" alt="ACL Basket Longué" width={36} height={36} priority />
              </span>
              <span className="leading-tight">
                ACL Palet
                <span className="block text-[11px] font-normal text-shell-muted">
                  ACL Basket Longué · Tournoi de palet vendéen
                </span>
              </span>
            </Link>
          </div>
        </header>

        <main className="w-full flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </body>
    </html>
  );
}
