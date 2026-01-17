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
  const scrollThreshold = 10;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;

      if (Math.abs(scrollDelta) < scrollThreshold) return;

      if (currentScrollY < 50) {
        setIsVisible(true);
      } else if (scrollDelta > 0 && currentScrollY > 100) {
        setIsVisible(false);
      } else if (scrollDelta < 0) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const baseItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/collection", icon: BookOpen, label: "Collection" },
    { href: "/shop", icon: ShoppingBag, label: "Shop" },
  ];

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
        {/* Vintage newsprint container */}
        <div className="mx-3 mb-3 bg-vintage-cream border-4 border-vintage-ink shadow-vintage">
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
                  className={`mobile-nav-item flex flex-col items-center gap-1 px-3 py-2 transition-all duration-200 ${
                    isActive
                      ? "text-vintage-red"
                      : isComingSoon
                      ? "text-vintage-inkFaded"
                      : "text-vintage-inkSoft hover:text-vintage-ink"
                  }`}
                >
                  <div
                    className={`nav-icon p-1.5 transition-all duration-200 ${
                      isActive
                        ? "bg-vintage-yellow border-2 border-vintage-ink shadow-vintage-sm"
                        : ""
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                  </div>
                  <span
                    className={`font-display text-[10px] tracking-wider uppercase ${
                      isActive ? "font-bold" : ""
                    }`}
                  >
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

      {/* Coming Soon Toast - Vintage Style */}
      {showComingSoon && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-vintage-ink text-vintage-yellow font-display text-sm uppercase tracking-wider border-2 border-vintage-yellow shadow-vintage animate-in fade-in slide-in-from-bottom-2 duration-200">
          Shop coming soon!
        </div>
      )}
    </>
  );
}
