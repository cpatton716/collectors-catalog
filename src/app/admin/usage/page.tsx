"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Activity,
  Database,
  Server,
  DollarSign,
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  BarChart3,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface UsageMetric {
  name: string;
  current: number;
  limit: number;
  unit: string;
  percentage: number;
  status: "ok" | "warning" | "critical";
  dashboard?: string;
}

interface UsageData {
  metrics: UsageMetric[];
  errors?: string[];
  overallStatus: "ok" | "warning" | "critical";
  thresholds: { warning: number; critical: number };
  checkedAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatValue(value: number, unit: string): string {
  if (unit === "bytes") return formatBytes(value);
  if (unit === "USD") return `$${value.toFixed(2)}`;
  return value.toLocaleString();
}

function getIcon(name: string) {
  if (name.includes("Database")) return Database;
  if (name.includes("Redis") || name.includes("Upstash")) return Zap;
  if (name.includes("Cost") || name.includes("USD")) return DollarSign;
  if (name.includes("User") || name.includes("Profile")) return Users;
  if (name.includes("Scan")) return BarChart3;
  return Server;
}

function StatusBadge({ status }: { status: "ok" | "warning" | "critical" }) {
  if (status === "critical") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
        <XCircle className="w-3 h-3" />
        Critical
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
      <CheckCircle className="w-3 h-3" />
      OK
    </span>
  );
}

function ProgressBar({ percentage, status }: { percentage: number; status: string }) {
  const width = Math.min(percentage * 100, 100);
  const colorClass =
    status === "critical"
      ? "bg-red-500"
      : status === "warning"
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all duration-500`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function AdminUsagePage() {
  const { isLoaded, isSignedIn } = useUser();
  const [data, setData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/usage");
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Access denied. Admin privileges required.");
        }
        throw new Error("Failed to fetch usage data");
      }
      const result = await response.json();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchUsage();
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the admin dashboard.</p>
          <Link
            href="/sign-in"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/collection"
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <Activity className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Service Usage Monitor</h1>
            </div>
            <button
              onClick={fetchUsage}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {isLoading && !data ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : data ? (
          <>
            {/* Overall Status Card */}
            <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Overall System Status</h2>
                  <p className="text-sm text-gray-500">
                    Last checked: {new Date(data.checkedAt).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={data.overallStatus} />
              </div>
              {data.overallStatus !== "ok" && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    {data.overallStatus === "critical"
                      ? "⚠️ One or more services are at critical usage levels. Immediate attention recommended."
                      : "⚡ Some services are approaching their limits. Consider upgrading or optimizing usage."}
                  </p>
                </div>
              )}
            </div>

            {/* Threshold Info */}
            <div className="mb-6 flex gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                OK: &lt; {data.thresholds.warning * 100}%
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                Warning: {data.thresholds.warning * 100}% - {data.thresholds.critical * 100}%
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                Critical: &gt; {data.thresholds.critical * 100}%
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.metrics.map((metric) => {
                const Icon = getIcon(metric.name);
                return (
                  <div
                    key={metric.name}
                    className="p-5 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 text-sm">{metric.name}</h3>
                      </div>
                      {metric.dashboard && (
                        <a
                          href={metric.dashboard}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Open Dashboard"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatValue(metric.current, metric.unit)}
                        </span>
                        <span className="text-sm text-gray-500">
                          / {formatValue(metric.limit, metric.unit)}
                        </span>
                      </div>
                    </div>

                    {metric.percentage > 0 && (
                      <>
                        <ProgressBar percentage={metric.percentage} status={metric.status} />
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {(metric.percentage * 100).toFixed(1)}% used
                          </span>
                          <StatusBadge status={metric.status} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Errors Section */}
            {data.errors && data.errors.length > 0 && (
              <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">Errors fetching some metrics:</h3>
                <ul className="list-disc list-inside text-sm text-red-700">
                  {data.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Links */}
            <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-4">Service Dashboards</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: "Supabase", url: "https://supabase.com/dashboard", icon: Database },
                  { name: "Upstash", url: "https://console.upstash.com", icon: Zap },
                  { name: "Anthropic", url: "https://console.anthropic.com", icon: BarChart3 },
                  { name: "Clerk", url: "https://dashboard.clerk.com", icon: Users },
                ].map((service) => (
                  <a
                    key={service.name}
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <service.icon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{service.name}</span>
                    <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                  </a>
                ))}
              </div>
            </div>

            {/* Admin Links */}
            <div className="mt-6 flex gap-4">
              <Link
                href="/admin/key-info"
                className="text-sm text-blue-600 hover:underline"
              >
                → Key Info Moderation
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
