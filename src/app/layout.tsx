import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import AskProfessor from "@/components/AskProfessor";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collector's Catalog - Catalog Your Collection",
  description:
    "Upload comic book covers to identify, track, and sell your collection",
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
          <Providers>
            <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
              <Navigation />
              <main className="container mx-auto px-4 py-8">{children}</main>
              <AskProfessor />
            </div>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
