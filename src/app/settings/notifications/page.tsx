"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { useUser } from "@clerk/nextjs";

import { AlertCircle, ArrowLeft, Bell, Check, Loader2, Mail, Smartphone } from "lucide-react";

import { useToast } from "@/components/Toast";

interface NotificationSettings {
  msgPushEnabled: boolean;
  msgEmailEnabled: boolean;
}

export default function NotificationSettingsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    msgPushEnabled: true,
    msgEmailEnabled: true,
  });

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/settings/notifications");
        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }
        const data = await response.json();
        setSettings({
          msgPushEnabled: data.msgPushEnabled ?? true,
          msgEmailEnabled: data.msgEmailEnabled ?? true,
        });
      } catch (err) {
        console.error("Failed to load notification settings:", err);
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    if (isSignedIn) {
      fetchSettings();
    } else if (isLoaded) {
      setLoading(false);
    }
  }, [isSignedIn, isLoaded]);

  async function updateSetting(key: keyof NotificationSettings, value: boolean) {
    setSaving(key);
    setError(null);

    // Optimistically update UI
    const previousSettings = { ...settings };
    setSettings((prev) => ({ ...prev, [key]: value }));

    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      showToast(value ? "Notifications enabled" : "Notifications disabled", "success");
    } catch (err) {
      console.error("Failed to update notification settings:", err);
      // Revert on error
      setSettings(previousSettings);
      setError("Failed to save setting");
      showToast("Failed to save setting", "error");
    } finally {
      setSaving(null);
    }
  }

  // Loading state
  if (!isLoaded || loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Sign in to manage notifications
          </h1>
          <p className="text-gray-600">
            Create an account to customize your notification preferences.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 px-4">
      {/* Back link */}
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Account Settings
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notification Settings
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Control how you receive notifications about messages
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Settings card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Push Notifications */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Smartphone className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Get notified in your browser when you receive new messages
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.msgPushEnabled}
              onChange={(value) => updateSetting("msgPushEnabled", value)}
              loading={saving === "msgPushEnabled"}
            />
          </div>
        </div>

        {/* Email Notifications */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Receive email alerts for new messages when you&apos;re offline
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.msgEmailEnabled}
              onChange={(value) => updateSetting("msgEmailEnabled", value)}
              loading={saving === "msgEmailEnabled"}
            />
          </div>
        </div>
      </div>

      {/* Info text */}
      <p className="mt-4 text-xs text-gray-400 text-center">Changes are saved automatically</p>
    </div>
  );
}

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  loading?: boolean;
}

function ToggleSwitch({ enabled, onChange, loading }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? "bg-indigo-600" : "bg-gray-200"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span className="sr-only">Toggle notification</span>
      <span
        className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      >
        {loading ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
          </span>
        ) : enabled ? (
          <span className="absolute inset-0 flex items-center justify-center text-indigo-600 opacity-100 transition-opacity duration-200 ease-in">
            <Check className="w-3 h-3" />
          </span>
        ) : null}
      </span>
    </button>
  );
}
