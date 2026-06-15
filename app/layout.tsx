import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบบริหารการสอน 🐝",
  description: "ระบบบริหารการสอนและการลาของครูโรงเรียน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" data-theme="bumblebee" className={`${notoThai.variable} h-full`}>
      <body className="min-h-full bg-base-200 antialiased">{children}</body>
    </html>
  );
}
