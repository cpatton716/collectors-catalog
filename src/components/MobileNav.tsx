"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Home, BookOpen, ShoppingBag, KeyRound, Gavel } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10; // Minimum scroll distance to trigger hide/show

  // Track when component has mounted to avoid hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;

      // Only trigger if scroll distance exceeds threshold
      if (Math.abs(scrollDelta) < scrollThreshold) return;

      // At top of page - always show
      if (currentScrollY < 50) {
        setIsVisible(true);
      }
      // Scrolling down - hide
      else if (scrollDelta > 0 && currentScrollY > 100) {
        setIsVisible(false);
      }
      // Scrolling up - show
      else if (scrollDelta < 0) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Base items for all users
  const baseItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/collection", icon: BookOpen, label: "Collection" },
    { href: "/shop", icon: ShoppingBag, label: "Shop" },
  ];

  // Add My Listings and Key Hunt for signed-in users (only after mount to avoid hydration mismatch)
  const navItems = hasMounted && isSignedIn
    ? [
        ...baseItems,
        { href: "/my-auctions", icon: Gavel, label: "Listings" },
        { href: "/key-hunt", icon: KeyRound, label: "Key Hunt" },
      ]
    : baseItems;

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if ('comingSoon' in item && item.comingSoon) {
      e.preventDefault();
      setShowComingSoon(true);
      setTimeout(() => setShowComingSoon(false), 2000);
    }
  };

  return (
    <>
      <nav
        className={`fixed bottom-0 left-0 right-0 md:hidden z-50 transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Glassmorphism container with retro-futuristic styling */}
        <div className="mx-3 mb-3 bg-cc-cream/90 backdrop-blur-lg rounded-2xl shadow-lg border-2 border-cc-ink/10">
          <div className="flex items-center justify-around py-2 px-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const isComingSoon = 'comingSoon' in item && item.comingSoon;

              return (
                <Link
                  key={item.href}
                  href={isComingSoon ? "#" : item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-cc-scanner/15 text-cc-scanner border border-cc-scanner/30"
                      : isComingSoon
                      ? "text-cc-ink/30"
                      : "text-cc-ink/60 hover:text-cc-ink hover:bg-cc-ink/5"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        {/* Safe area spacer for iOS */}
        <div className="h-safe-area-inset-bottom bg-transparent" />
      </nav>

      {/* Coming Soon Toast */}
      {showComingSoon && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-cc-ink text-cc-scanner text-sm font-medium rounded-lg shadow-retro animate-slide-up">
          Shop coming soon!
        </div>
      )}
    </>
  );
}
