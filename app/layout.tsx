import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import DialogProvider from "@/components/DialogProvider";

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  // Use the uploaded school logo as the favicon; version param busts the cache
  // whenever the logo (or any setting) changes.
  const version = settings.updatedAt ? new Date(settings.updatedAt).getTime() : 0;
  const iconUrl = settings.logoBase64 ? `/api/logo?v=${version}` : "/favicon.ico";
  return {
    title: settings.schoolName
      ? `${settings.schoolName} 🦆`
      : "ระบบบริหารการสอน 🦆",
    description: "ระบบบริหารการสอนและการลาของครูโรงเรียน",
    icons: { icon: iconUrl, shortcut: iconUrl, apple: iconUrl },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" data-theme="bumblebee" className={`${notoThai.variable} h-full`}>
      <body className="min-h-full bg-base-200 antialiased">
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
