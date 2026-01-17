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
      <nav className="bg-cc-cream/95 backdrop-blur-sm border-b-2 border-cc-ink/10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <ChestIcon size={36} />
              <span className="font-display text-2xl text-cc-ink tracking-wide group-hover:text-cc-scanner transition-colors">
                COLLECTORS CHEST
              </span>
            </Link>

            {/* Navigation Links - hidden on mobile (MobileNav handles that) */}
            <div className="hidden md:flex items-center space-x-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-cc-scanner/15 text-cc-scanner border border-cc-scanner/30"
                        : "text-cc-ink/70 hover:bg-cc-ink/5 hover:text-cc-ink"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}
              {/* My Listings - signed in only */}
              <SignedIn>
                <Link
                  href="/my-auctions"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    pathname === "/my-auctions"
                      ? "bg-cc-scanner/15 text-cc-scanner border border-cc-scanner/30"
                      : "text-cc-ink/70 hover:bg-cc-ink/5 hover:text-cc-ink"
                  }`}
                >
                  <Gavel className="w-5 h-5" />
                  <span className="font-medium">My Listings</span>
                </Link>
              </SignedIn>
            </div>

            {/* Right side: Notifications + Professor + Auth */}
            <div className="flex items-center gap-2">
              {/* Notifications (signed in only) */}
              <SignedIn>
                <NotificationBell />
              </SignedIn>

              {/* Ask the Professor button */}
              <button
                onClick={() => setShowProfessor(true)}
                className="p-2 mr-4 rounded-lg bg-cc-ink hover:bg-cc-ink/80 transition-all duration-200 shadow-retro-sm glow-scanner"
                aria-label="Ask the Professor"
              >
                <Brain className="w-5 h-5 text-cc-scanner" />
              </button>

              {/* Auth */}
              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  userProfileUrl="/profile"
                  userProfileMode="navigation"
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9",
                    },
                  }}
                />
              </SignedIn>
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="flex items-center gap-1.5 p-2 sm:px-4 sm:py-2 btn-scanner text-sm rounded-lg shadow-retro-sm hover:shadow-scanner transition-all duration-200"
                >
                  <LogIn className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline font-semibold">Sign In</span>
                </Link>
              </SignedOut>
            </div>
          </div>
        </div>
      </nav>

      {/* Ask the Professor Modal */}
      {showProfessor && (
        <div
          className="fixed inset-0 z-50 bg-cc-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowProfessor(false)}
        >
          <div
            className="bg-cc-cream rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl border-2 border-cc-ink/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-cc-ink p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cc-scanner/20 rounded-xl glow-scanner">
                    <Brain className="w-6 h-6 text-cc-scanner" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-cc-scanner tracking-wide">ASK THE PROFESSOR</h2>
                    <p className="text-cc-cream/70 text-sm">Your guide to Collectors Chest</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfessor(false)}
                  className="p-2 hover:bg-cc-scanner/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-cc-scanner" />
                </button>
              </div>
            </div>

            {/* FAQ List */}
            <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4">
              <p className="text-cc-ink/70 text-sm mb-4">
                Welcome, collector! Here are answers to commonly asked questions.
              </p>
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border-2 border-cc-ink/10 rounded-lg overflow-hidden bg-white/50"
                  >
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-cc-scanner/5 transition-colors"
                    >
                      <span className="font-medium text-cc-ink pr-4">{faq.question}</span>
                      {expandedFAQ === index ? (
                        <ChevronUp className="w-5 h-5 text-cc-scanner flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-cc-ink/50 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFAQ === index && (
                      <div className="px-4 pb-4 text-cc-ink/70 text-sm border-t border-cc-ink/10 pt-3">
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
