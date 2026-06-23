import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_THEME_ID, DEFAULT_THEME_MODE } from "@/lib/themes";
import { LayoutDebugHostGate } from "@/components/debug/LayoutDebugHostGate";
import { PwaServiceWorkerRegister } from "@/components/pwa/PwaServiceWorkerRegister";
import { DEVICE_BOOT_SCRIPT } from "@/lib/device";
import { ADMIN_THEME_BOOT_SCRIPT } from "@/lib/admin-theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Hospira",
  description: "Software modern pentru pensiuni si hoteluri mici",
  applicationName: "Hospira",
  icons: {
    icon: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/brand/logo.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Hospira",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e14" },
  ],
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
      data-display-profile="laptop"
      data-layout-mode="desktop"
      data-layout-orientation="landscape"
      data-layout-chrome="wide"
      data-layout-bp="xl"
      data-viewport-height="standard"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DEVICE_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaServiceWorkerRegister />
        <LayoutDebugHostGate />
      </body>
    </html>
  );
}
