import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_THEME_ID, DEFAULT_THEME_MODE } from "@/lib/themes";
import { LayoutDebugHost } from "@/components/debug/LayoutDebugHost";
import { DEVICE_BOOT_SCRIPT } from "@/lib/device";
import { ADMIN_THEME_BOOT_SCRIPT } from "@/lib/admin-theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hospira",
  description: "Software modern pentru pensiuni si hoteluri mici",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME_ID}
      data-mode={DEFAULT_THEME_MODE}
      data-device="desktop"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DEVICE_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <LayoutDebugHost />
      </body>
    </html>
  );
}
