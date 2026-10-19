import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Rubik } from "next/font/google";
import "./word-quest.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const hebrew = Rubik({ subsets: ["hebrew"], weight: ["500"], variable: "--font-he" });

export const metadata: Metadata = {
  title: "Word Quest",
  description: "Practise your English vocabulary a few minutes a day.",
  appleWebApp: { capable: true, title: "Word Quest", statusBarStyle: "default" },
  manifest: "/word-quest/manifest.webmanifest",
  icons: { apple: "/word-quest/wq-apple-180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F2FA" },
    { media: "(prefers-color-scheme: dark)", color: "#12111F" },
  ],
};

export default function WordQuestLayout({ children }: { children: React.ReactNode }) {
  return <div className={`wq ${display.variable} ${body.variable} ${hebrew.variable}`}>{children}</div>;
}
