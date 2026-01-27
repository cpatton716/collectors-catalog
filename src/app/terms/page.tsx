"use client";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-600 mt-2">Last updated: January 27, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl shadow-sm p-8 prose prose-gray max-w-none">
          {/* REPLACE THIS SECTION WITH YOUR GENERATED TERMS OF SERVICE */}

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Collectors Chest (&quot;Service&quot;), you agree to be bound by
            these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please
            do not use our Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>Collectors Chest is a comic book collection management platform that provides:</p>
          <ul>
            <li>AI-powered comic cover recognition</li>
            <li>Collection tracking and management</li>
            <li>Price estimates based on market data</li>
            <li>A marketplace for buying and selling comics</li>
          </ul>

          <h2>3. User Accounts</h2>
          <p>To access certain features, you must create an account. You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Providing accurate and complete information</li>
          </ul>

          <h2>4. Marketplace Terms</h2>
          <h3>4.1 Seller Responsibilities</h3>
          <p>As a seller, you agree to:</p>
          <ul>
            <li>Accurately describe items listed for sale</li>
            <li>Ship items within the specified timeframe</li>
            <li>Honor accepted bids and completed purchases</li>
            <li>Comply with all applicable laws regarding online sales</li>
          </ul>

          <h3>4.2 Buyer Responsibilities</h3>
          <p>As a buyer, you agree to:</p>
          <ul>
            <li>Pay for items you purchase or win at auction</li>
            <li>Provide accurate shipping information</li>
            <li>Review items promptly upon receipt</li>
          </ul>

          <h3>4.3 Transaction Fees</h3>
          <p>
            Collectors Chest may charge transaction fees on marketplace sales. Current fee
            structures will be clearly displayed before listing or purchasing.
          </p>

          <h3>4.4 Disputes</h3>
          <p>
            We encourage buyers and sellers to resolve disputes directly. Collectors Chest may, at
            its discretion, mediate disputes but is not obligated to do so.
          </p>

          <h3>4.5 Listing Cancellation Policy</h3>
          <p>The following rules govern the cancellation of marketplace listings:</p>
          <ul>
            <li>
              <strong>Auctions:</strong> Once a bid has been placed on an auction, the listing
              cannot be cancelled. Sellers must honor all bids and complete the transaction with the
              winning bidder.
            </li>
            <li>
              <strong>Auctions without bids:</strong> Auctions that have received no bids may be
              cancelled at any time before the auction ends.
            </li>
            <li>
              <strong>Fixed-price listings:</strong> Fixed-price listings may be cancelled at any
              time. If there are pending offers on the listing, all offer-makers will be notified of
              the cancellation.
            </li>
            <li>
              <strong>Duplicate listings:</strong> Each comic may only have one active listing at a
              time. Creating duplicate listings for the same item is prohibited.
            </li>
          </ul>
          <p>
            Repeated bad-faith cancellations or failure to honor completed transactions may result
            in account suspension or negative reputation impact.
          </p>

          <h2>5. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal purpose</li>
            <li>Post fraudulent listings or engage in bid manipulation</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Attempt to circumvent security measures</li>
            <li>Use automated systems to access the Service without permission</li>
            <li>Infringe on intellectual property rights</li>
          </ul>

          <h2>6. Intellectual Property</h2>
          <p>
            The Service, including its design, features, and content created by Collectors Chest, is
            protected by copyright and other intellectual property laws. Comic book images and
            information are the property of their respective owners.
          </p>

          <h2>7. User Content</h2>
          <p>
            You retain ownership of content you upload (such as collection data and images). By
            uploading content, you grant us a license to use it to provide and improve the Service.
          </p>

          <h2>8. Price Estimates Disclaimer</h2>
          <p>
            Price estimates provided by Collectors Chest are for informational purposes only and are
            based on recent eBay sales data and AI analysis. We do not guarantee the accuracy of any
            price estimate, and actual market values may vary significantly.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, COLLECTORS CHEST SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
            LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR
            USE OF THE SERVICE.
          </p>

          <h2>10. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Collectors Chest and its affiliates from any
            claims, damages, or expenses arising from your use of the Service or violation of these
            Terms.
          </p>

          <h2>12. Termination</h2>
          <p>
            We may suspend or terminate your account at any time for violation of these Terms. You
            may delete your account at any time through your profile settings.
          </p>

          <h2>13. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. Continued use of the Service after changes
            constitutes acceptance of the modified Terms.
          </p>

          <h2>14. Governing Law</h2>
          <p>
            These Terms shall be governed by the laws of the State of California, without regard to
            its conflict of law provisions.
          </p>

          <h2>15. Contact</h2>
          <p>For questions about these Terms, please contact us at:</p>
          <ul>
            <li>Email: legal@collectors-chest.com</li>
          </ul>

          {/* END REPLACEMENT SECTION */}
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <Link href="/privacy" className="hover:text-gray-700">
          Privacy Policy
        </Link>
        <span className="mx-2">|</span>
        <Link href="/" className="hover:text-gray-700">
          Home
        </Link>
      </div>
    </div>
  );
}
