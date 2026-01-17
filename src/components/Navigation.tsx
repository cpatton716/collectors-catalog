"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Camera, BookOpen, Home, LogIn, BarChart3, Brain, X, ChevronDown, ChevronUp, ShoppingBag, Gavel } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { ChestIcon } from "./icons/ChestIcon";

// FAQ content for Ask the Professor
const faqs = [
  {
    question: "How do I add a comic to my collection?",
    answer:
      "Click the '+' button or go to 'Scan'. You can either upload a photo of the cover for technopathic recognition, scan a barcode, or enter details manually. After reviewing the details, click 'Add to Collection'.",
  },
  {
    question: "What features are available for guests vs registered users?",
    answer:
      "Guests can explore the app, view the 'How It Works' guide, check out Professor's Hottest Books, and try scanning a comic. However, to save comics to your collection, track values, create custom lists, mark items as sold, and access your data across devices, you'll need to create a free account.",
  },
  {
    question: "What does 'Slabbed' mean?",
    answer:
      "A 'slabbed' comic is one that has been professionally graded by a service like CGC, CBCS, or PGX. The comic is sealed in a protective case with a grade label.",
  },
  {
    question: "How accurate are the price estimates?",
    answer:
      "Price estimates are generated using technopathy based on recent market trends. They provide a general guideline but actual prices can vary based on condition, demand, and where you sell.",
  },
  {
    question: "What is Key Hunt?",
    answer:
      "Key Hunt is a quick price lookup feature designed for finding key comics at conventions. Scan a cover, scan a barcode, or manually enter a title to instantly see the average price for any grade.",
  },
  {
    question: "Can I create custom lists?",
    answer:
      "Yes! Go to your Collection page and look for the option to create a new list. You can organize comics by series, favorites, want list, or any category you choose.",
  },
  {
    question: "How do I mark a comic as sold?",
    answer:
      "View the comic in your collection and look for the 'Mark as Sold' option. Enter the sale price and date, and it will be moved to your sales history.",
  },
];

export function Navigation() {
  const pathname = usePathname();
  const [showProfessor, setShowProfessor] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/scan", label: "Scan Book", icon: Camera },
    { href: "/collection", label: "My Collection", icon: BookOpen },
    { href: "/shop", label: "Shop", icon: ShoppingBag },
    { href: "/stats", label: "Stats", icon: BarChart3 },
  ];

  return (
    <>
      {/* Vintage Newsprint Navigation */}
      <nav className="bg-vintage-cream border-b-4 border-vintage-ink shadow-[0_4px_0_#E8D4A8]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <ChestIcon size={36} />
              <span className="font-display text-2xl text-vintage-ink tracking-wide uppercase">
                Collectors Chest
              </span>
            </Link>

            {/* Navigation Links - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`nav-link flex items-center space-x-2 px-4 py-2 transition-colors ${
                      isActive
                        ? "text-vintage-red"
                        : "text-vintage-ink hover:text-vintage-red"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-display text-sm tracking-wide">{link.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-1 bg-vintage-red" />
                    )}
                  </Link>
                );
              })}
              {/* My Listings - signed in only */}
              <SignedIn>
                <Link
                  href="/my-auctions"
                  className={`nav-link flex items-center space-x-2 px-4 py-2 transition-colors ${
                    pathname === "/my-auctions"
                      ? "text-vintage-red"
                      : "text-vintage-ink hover:text-vintage-red"
                  }`}
                >
                  <Gavel className="w-5 h-5" />
                  <span className="font-display text-sm tracking-wide">My Listings</span>
                </Link>
              </SignedIn>
            </div>

            {/* Right side: Notifications + Professor + Auth */}
            <div className="flex items-center gap-3">
              {/* Notifications (signed in only) */}
              <SignedIn>
                <NotificationBell />
              </SignedIn>

              {/* Ask the Professor button - vintage style */}
              <button
                onClick={() => setShowProfessor(true)}
                className="p-2 mr-2 bg-vintage-yellow border-2 border-vintage-ink shadow-vintage-sm hover:shadow-vintage hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150"
                aria-label="Ask the Professor"
              >
                <Brain className="w-5 h-5 text-vintage-ink" />
              </button>

              {/* Auth */}
              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  userProfileUrl="/profile"
                  userProfileMode="navigation"
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 border-2 border-vintage-ink",
                    },
                  }}
                />
              </SignedIn>
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="btn-vintage btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              </SignedOut>
            </div>
          </div>
        </div>
      </nav>

      {/* Ask the Professor Modal - Vintage Style */}
      {showProfessor && (
        <div
          className="fixed inset-0 z-50 bg-vintage-ink/60 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowProfessor(false)}
        >
          <div
            className="bg-vintage-cream border-4 border-vintage-ink shadow-vintage-lg w-full max-w-lg max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Styled like a newspaper headline */}
            <div className="bg-vintage-blue border-b-4 border-vintage-ink p-6 text-white relative">
              {/* Corner fold effect */}
              <div className="absolute top-0 right-0 w-8 h-8 bg-vintage-cream border-l-4 border-b-4 border-vintage-ink transform origin-top-right" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-vintage-yellow border-2 border-vintage-ink">
                    <Brain className="w-6 h-6 text-vintage-ink" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-vintage-yellow tracking-wide uppercase">
                      Ask the Professor
                    </h2>
                    <p className="font-mono text-xs text-blue-200 tracking-wider uppercase">
                      Your Guide to Collectors Chest
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfessor(false)}
                  className="p-2 bg-vintage-red border-2 border-vintage-ink hover:bg-vintage-redDark transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* FAQ List */}
            <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4 bg-vintage-paper">
              <p className="font-serif text-vintage-inkSoft text-sm mb-4 italic">
                Welcome, collector! Here are answers to commonly asked questions.
              </p>
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border-3 border-vintage-ink bg-vintage-cream overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-vintage-aged transition-colors"
                    >
                      <span className="font-display text-sm text-vintage-ink pr-4 uppercase tracking-wide">
                        {faq.question}
                      </span>
                      {expandedFAQ === index ? (
                        <ChevronUp className="w-5 h-5 text-vintage-red flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-vintage-inkFaded flex-shrink-0" />
                      )}
                    </button>
                    {expandedFAQ === index && (
                      <div className="px-4 pb-4 font-serif text-vintage-inkSoft text-sm border-t-2 border-vintage-ink/20 pt-3 bg-white/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
