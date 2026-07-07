import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "./sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Salon Booking",
  description: "Book salon appointments and view your stylist schedule.",
  applicationName: "Salon Booking",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Salon Booking",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/apple-icon.png",
  },
};

// In Next.js 16 themeColor/viewport live in a separate `viewport` export.
export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
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
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
