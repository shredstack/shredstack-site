import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";
import { ConditionalChrome } from "@/components/ConditionalChrome";
import { GOOGLE_SITE_VERIFICATION, SITE_URL } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ShredStack | Sarah Dorich",
    template: "%s | ShredStack",
  },
  description:
    "AI & Data Engineer building cool things. Projects, blog, and playground.",
  keywords: [
    "software engineer",
    "data engineer",
    "AI",
    "machine learning",
    "Next.js",
    "TypeScript",
  ],
  icons: {
    icon: "/shredstack_logo.png",
    apple: "/shredstack_logo.png",
  },
  // Only render the Search Console tag once a token is set (see src/lib/site.ts).
  ...(GOOGLE_SITE_VERIFICATION ? { verification: { google: GOOGLE_SITE_VERIFICATION } } : {}),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Production-only analytics. VERCEL_ENV is inlined at build time (next.config.ts), so in
  // preview and local builds this is `"" === "production"`, the import is dead code, and no
  // analytics code ships at all.
  const SiteAnalytics =
    process.env.VERCEL_ENV === "production"
      ? (await import("@/components/SiteAnalytics")).SiteAnalytics
      : null;

  return (
    <html lang="en" className={`${inter.variable} ${firaCode.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <ConditionalChrome>{children}</ConditionalChrome>
        {SiteAnalytics && <SiteAnalytics />}
      </body>
    </html>
  );
}
