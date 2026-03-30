import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koe Asset Maker - 声の温度を、資産にしよう。",
  description:
    "音声配信をワンクリックで文字起こし・要約・SNS投稿案・note記事に変換。あなたの声を知識資産に。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen">
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
