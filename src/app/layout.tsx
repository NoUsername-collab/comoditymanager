import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_THEME } from "@/lib/presentation-themes";
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
  title: "Casa Emil — Pensiune Tasnad",
  description: "Cerere de cazare și rezervări — Casa Emil, Tasnad",
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
  const themeScript = `(function(){try{var t=localStorage.getItem("casaemil-theme");if(t==="onyx"||t==="garden"||t==="sand")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

  return (
    <html
      lang="ro"
      data-theme={DEFAULT_THEME}
      data-device="desktop"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DEVICE_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
