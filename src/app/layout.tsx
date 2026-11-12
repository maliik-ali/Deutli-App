import type { Metadata, Viewport } from "next";
import { Figtree, Inter, Noto_Nastaliq_Urdu, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

// Fallback for the brand font "AOK Buenos Aires" (see globals.css).
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "600"],
  preload: false,
});

// Hindi meanings of saved words.
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "600"],
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Deutli",
    template: "%s · Deutli",
  },
  description: "Pass your German B1 — with AI and a real teacher.",
};

export const viewport: Viewport = {
  themeColor: "#081028",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${figtree.variable} ${nastaliq.variable} ${devanagari.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
