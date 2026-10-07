import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maction 客服中心",
  description: "课程、Preview、客户跟进与广告成效管理",
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
    <html lang="zh-Hans">
      <body className="antialiased">{children}</body>
    </html>
  );
}
