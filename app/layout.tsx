import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "현장관리 플랫폼 홈 대시보드",
  description: "모바일 중심 소규모 건설 현장 관리자용 홈 대시보드 UI 목업"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-[#eef3ef] text-foreground antialiased">{children}</body>
    </html>
  );
}
