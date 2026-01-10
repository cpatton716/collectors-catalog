import Link from "next/link";
import { BookX, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <BookX className="w-10 h-10 text-gray-400" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        Collection Not Found
      </h1>

      <p className="text-gray-600 mb-8">
        This collection doesn&apos;t exist or isn&apos;t public. The owner may have made it private,
        or the link may be incorrect.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Home className="w-5 h-5" />
          Go Home
        </Link>
        <Link
          href="/scan"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Search className="w-5 h-5" />
          Start Your Collection
        </Link>
      </div>
    </div>
  );
}
