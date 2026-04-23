import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "현장관리 플랫폼 모바일 대시보드",
  description: "소규모 건설 현장 관리자를 위한 모바일 중심 홈 대시보드 UI 목업"
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
