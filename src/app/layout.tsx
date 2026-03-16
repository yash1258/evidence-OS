import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
