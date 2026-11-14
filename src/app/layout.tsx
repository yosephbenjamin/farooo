import type { Metadata, Viewport } from "next";
import "@fontsource/newsreader/300.css";
import "@fontsource/newsreader/300-italic.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faro",
  description: "Cala is the hidden cove. Faro is the lighthouse that guides you to it.",
};

export const viewport: Viewport = { themeColor: "#f6e8cd" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
