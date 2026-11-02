import type { Metadata, Viewport } from "next";
import { Inter, Noto_Nastaliq_Urdu, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "600"],
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Gateway2Deutsch",
    template: "%s · Gateway2Deutsch",
  },
  description: "Pass your German B1 — with AI and a real teacher.",
};

export const viewport: Viewport = {
  themeColor: "#0d0e1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} ${nastaliq.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
