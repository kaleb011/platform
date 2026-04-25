import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "현장관리 플랫폼",
  description: "작업일보, 적산, 공정, 자재 관리를 위한 모바일 현장관리 프로토타입"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
