import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BackToTopButton } from "@/components/back-to-top-button";
import { DisableZoom } from "@/components/disable-zoom";
import { FlashToast } from "@/components/flash-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sip Purified Water",
  description: "Sip Water — clean hydration, delivered.",
  icons: {
    icon: "/sip-logo-circle.png",
    shortcut: "/sip-logo-circle.png",
    apple: "/sip-logo-circle.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <DisableZoom />
        <FlashToast />
        {children}
        <BackToTopButton />
      </body>
    </html>
  );
}
