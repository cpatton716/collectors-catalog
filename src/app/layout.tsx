import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import { MobileUtilitiesFAB } from "@/components/MobileUtilitiesFAB";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PostHogProvider } from "@/components/PostHogProvider";

// Display font - Bold, condensed, comic book energy
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  display: "swap",
});

// Body font - Clean, professional, great legibility
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

// Monospace - Tech scanner feel for prices and data
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Collectors Chest - Track, Value & Trade Your Comics",
  description:
    "The all-in-one comic collector's companion. Scan covers with technopathic recognition, track your collection's value, and buy or sell with fellow collectors.",
  manifest: "/manifest.json",
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
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0f1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${sourceSans.variable} ${bebasNeue.variable} ${jetbrainsMono.variable} font-sans`}>
          <PostHogProvider>
            <ServiceWorkerProvider>
              <Providers>
                <div className="min-h-screen bg-cc-cream pb-20 md:pb-0">
                  <Navigation />
                  <main className="container mx-auto px-4 py-8">{children}</main>
                  <MobileUtilitiesFAB />
                  <PWAInstallPrompt />
                </div>
              </Providers>
            </ServiceWorkerProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
