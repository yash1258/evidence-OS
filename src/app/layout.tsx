import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const appSans = Manrope({
  subsets: ["latin"],
  variable: "--font-app-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const appMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-app-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EvidenceOS - Multimodal Knowledge Agent",
  description:
    "Drop any content and chat with it. AI agent powered by Gemini 3 Flash with multimodal embeddings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${appSans.variable} ${appMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
