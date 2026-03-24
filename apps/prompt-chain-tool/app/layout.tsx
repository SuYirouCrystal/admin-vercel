import type { Metadata } from "next";

import ThemeScript from "@/components/theme-script";

import "./globals.css";

export const metadata: Metadata = {
  title: "Flavor Matrix",
  description: "Prompt-chain tool for humor flavors and step orchestration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
