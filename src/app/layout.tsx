import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";
import { ConditionalChrome } from "@/components/ConditionalChrome";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
});

export const metadata: Metadata = {
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${firaCode.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <ConditionalChrome>{children}</ConditionalChrome>
      </body>
    </html>
  );
}
