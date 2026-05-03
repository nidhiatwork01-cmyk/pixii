import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import "./globals.css";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Pixii AEO Scout — AI Visibility Diagnostic for Amazon Sellers",
  description:
    "Find out where AI sends your customers. Pixii AEO Scout scans Claude and Gemini for your brand mentions, ranks competitors, and scores your AI search visibility in seconds.",
  keywords: [
    "AEO",
    "Answer Engine Optimization",
    "Amazon sellers",
    "AI visibility",
    "Claude",
    "Gemini",
    "brand mentions",
    "Pixii",
  ],
  openGraph: {
    title: "Pixii AEO Scout",
    description: "Where does AI send your customers?",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
