import type { Metadata, Viewport } from "next";
import { Figtree, Inter, Noto_Nastaliq_Urdu, Noto_Sans_Devanagari, Nunito, Poppins } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

// Fallback for the brand font "AOK Buenos Aires" (see globals.css).
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Approved fonts for school branding. next/font downloads them at build time and serves them from our own domain
// (nothing is requested from Google when a student opens the app).
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], preload: false });

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
  metadataBase: new URL("https://app.deutli.com"),
  openGraph: {
    type: "website",
    siteName: "Deutli",
    title: "Deutli — German B1 exam prep",
    description: "Pass your German B1 — with AI and a real teacher.",
    url: "/",
  },
  twitter: { card: "summary", title: "Deutli — German B1 exam prep", description: "Pass your German B1 — with AI and a real teacher." },
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
      className={`${inter.variable} ${figtree.variable} ${poppins.variable} ${nunito.variable} ${nastaliq.variable} ${devanagari.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
