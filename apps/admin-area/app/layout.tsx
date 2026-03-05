import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Superadmin Control Center",
  description: "Admin area for analytics and content moderation",
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
