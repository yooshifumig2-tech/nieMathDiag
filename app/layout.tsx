import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUMI数学能力地图｜北京初中数学诊断",
  description: "面向人教版七、八年级的40分钟匿名数学水平诊断，提供章节掌握度、动态图形讲解与FUMI AI辅导。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
