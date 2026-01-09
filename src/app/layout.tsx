import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import AskProfessor from "@/components/AskProfessor";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collectors Chest - Track, Value & Trade Your Comics",
  description:
    "The all-in-one comic collector's companion. Scan covers with AI recognition, track your collection's value, and buy or sell with fellow collectors.",
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
