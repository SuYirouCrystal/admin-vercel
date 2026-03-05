import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Caption Studio",
  description: "Caption creation and rating workspace",
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
