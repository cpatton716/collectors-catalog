import type { Metadata, Viewport } from "next";
import { Anton, Crimson_Text, Courier_Prime } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import { MobileUtilitiesFAB } from "@/components/MobileUtilitiesFAB";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PostHogProvider } from "@/components/PostHogProvider";

// Bold condensed display font for headlines
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

// Elegant serif for body text
const crimsonText = Crimson_Text({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-crimson",
  display: "swap",
});

// Typewriter style for captions/accents
const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
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
  themeColor: "#C41E3A", // Action Comics Red
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${anton.variable} ${crimsonText.variable} ${courierPrime.variable} font-serif bg-vintage-paper`}
        >
          <PostHogProvider>
            <ServiceWorkerProvider>
              <Providers>
                <div className="min-h-screen pb-20 md:pb-0">
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
