import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import { MobileUtilitiesFAB } from "@/components/MobileUtilitiesFAB";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collectors Chest - Track, Value & Trade Your Comics",
  description:
    "The all-in-one comic collector's companion. Scan covers with AI recognition, track your collection's value, and buy or sell with fellow collectors.",
  manifest: "/manifest.json",
  themeColor: "#1e40af",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Collectors Chest",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ServiceWorkerProvider>
            <Providers>
              <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
                <Navigation />
                <main className="container mx-auto px-4 py-8">{children}</main>
                <MobileUtilitiesFAB />
                <PWAInstallPrompt />
              </div>
            </Providers>
          </ServiceWorkerProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
