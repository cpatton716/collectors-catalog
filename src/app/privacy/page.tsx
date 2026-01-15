"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: January 14, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl shadow-sm p-8 prose prose-gray max-w-none">
          {/* REPLACE THIS SECTION WITH YOUR GENERATED PRIVACY POLICY */}

          <h2>Introduction</h2>
          <p>
            Collectors Chest (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy and is committed to
            protecting your personal data. This privacy policy explains how we collect, use, disclose,
            and safeguard your information when you use our website and services at collectors-chest.com.
          </p>

          <h2>Information We Collect</h2>
          <h3>Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Email address, display name when you create an account via Clerk</li>
            <li><strong>Collection Data:</strong> Comic book information you add to your collection</li>
            <li><strong>Transaction Data:</strong> Payment and shipping information for marketplace purchases</li>
            <li><strong>Images:</strong> Photos you upload for cover recognition or listings</li>
          </ul>

          <h3>Information Collected Automatically</h3>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, scan counts</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
            <li><strong>Analytics:</strong> Aggregated usage patterns via PostHog</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <ul>
            <li>Provide and maintain our services</li>
            <li>Process marketplace transactions</li>
            <li>Improve our AI cover recognition</li>
            <li>Send service-related notifications</li>
            <li>Prevent fraud and abuse</li>
          </ul>

          <h2>Third-Party Services</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul>
            <li><strong>Clerk:</strong> Authentication and account management</li>
            <li><strong>Stripe:</strong> Payment processing</li>
            <li><strong>Supabase:</strong> Database hosting</li>
            <li><strong>Anthropic:</strong> AI-powered cover recognition</li>
            <li><strong>PostHog:</strong> Analytics</li>
            <li><strong>Sentry:</strong> Error tracking</li>
            <li><strong>Resend:</strong> Email notifications</li>
          </ul>

          <h2>California Consumer Privacy Act (CCPA)</h2>
          <p>
            If you are a California resident, you have specific rights regarding your personal information
            under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
          </p>
          <ul>
            <li><strong>Right to Know:</strong> You can request disclosure of the categories and specific pieces of personal information we have collected about you.</li>
            <li><strong>Right to Delete:</strong> You can request deletion of your personal information, subject to certain exceptions.</li>
            <li><strong>Right to Opt-Out:</strong> You can opt out of the sale or sharing of your personal information. Note: We do not sell your personal information.</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</li>
          </ul>
          <p>
            To exercise these rights, please contact us at privacy@collectors-chest.com or use the
            account deletion feature in your profile settings.
          </p>

          <h2>Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to
            provide services. You can delete your account at any time through your profile settings.
          </p>

          <h2>Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            information, including encryption, secure authentication, and regular security audits.
          </p>

          <h2>Children&apos;s Privacy</h2>
          <p>
            Our services are not intended for children under 13. We do not knowingly collect personal
            information from children under 13.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by
            posting the new policy on this page and updating the &quot;Last updated&quot; date.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about this privacy policy or our data practices, please contact us at:
          </p>
          <ul>
            <li>Email: privacy@collectors-chest.com</li>
          </ul>

          {/* END REPLACEMENT SECTION */}
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <Link href="/terms" className="hover:text-gray-700">
          Terms of Service
        </Link>
        <span className="mx-2">|</span>
        <Link href="/" className="hover:text-gray-700">
          Home
        </Link>
      </div>
    </div>
  );
}
