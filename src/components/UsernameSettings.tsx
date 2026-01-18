"use client";

import { useState, useEffect, useCallback } from "react";
import { AtSign, Check, X, Loader2, AlertCircle } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface UsernameData {
  username: string | null;
  displayPreference: "username_only" | "display_name_only" | "both";
}

export function UsernameSettings() {
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    error?: string;
    display?: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const debouncedUsername = useDebounce(username, 500);

  // Fetch current username on mount
  useEffect(() => {
    async function fetchUsername() {
      try {
        const res = await fetch("/api/username/current");
        if (res.ok) {
          const data: UsernameData = await res.json();
          if (data.username) {
            setUsername(data.username);
            setOriginalUsername(data.username);
          }
        }
      } catch (error) {
        console.error("Failed to fetch username:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsername();
  }, []);

  // Check availability when username changes
  useEffect(() => {
    async function checkAvailability() {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        setAvailability(null);
        return;
      }

      // Skip check if username hasn't changed from original
      if (debouncedUsername === originalUsername) {
        setAvailability({ available: true, display: `@${debouncedUsername}` });
        return;
      }

      setIsChecking(true);
      try {
        const res = await fetch(`/api/username?username=${encodeURIComponent(debouncedUsername)}`);
        const data = await res.json();
        setAvailability(data);
      } catch (error) {
        console.error("Failed to check availability:", error);
        setAvailability({ available: false, error: "Failed to check availability" });
      } finally {
        setIsChecking(false);
      }
    }
    checkAvailability();
  }, [debouncedUsername, originalUsername]);

  const handleSave = useCallback(async () => {
    if (!username || username.length < 3) return;
    if (!availability?.available) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || "Failed to save username");
        return;
      }

      setOriginalUsername(data.username);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save username:", error);
      setSaveError("Failed to save username");
    } finally {
      setIsSaving(false);
    }
  }, [username, availability?.available]);

  const hasChanges = username !== (originalUsername || "");
  const canSave = hasChanges && availability?.available && !isChecking && !isSaving;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AtSign className="w-5 h-5 text-gray-600" />
            Username
          </h2>
        </div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AtSign className="w-5 h-5 text-gray-600" />
          Username
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-600 mb-4">
          Choose a unique username for your public profile. This will be displayed as{" "}
          <span className="font-medium text-gray-900">@username</span> in the marketplace.
        </p>

        {/* Username Input */}
        <div className="relative">
          <div className="flex items-center">
            <span className="text-gray-500 text-lg mr-1">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                setUsername(value);
                setSaveError(null);
                setSaveSuccess(false);
              }}
              placeholder="your_username"
              maxLength={20}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
            <div className="ml-2 w-6 h-6 flex items-center justify-center">
              {isChecking && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
              {!isChecking && availability?.available && username.length >= 3 && (
                <Check className="w-5 h-5 text-green-500" />
              )}
              {!isChecking && availability && !availability.available && username.length >= 3 && (
                <X className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>

          {/* Validation Messages */}
          {username.length > 0 && username.length < 3 && (
            <p className="mt-2 text-sm text-amber-600">
              Username must be at least 3 characters
            </p>
          )}
          {availability && !availability.available && availability.error && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {availability.error}
            </p>
          )}
          {availability?.available && username.length >= 3 && hasChanges && (
            <p className="mt-2 text-sm text-green-600">
              {availability.display} is available!
            </p>
          )}
        </div>

        {/* Format Rules */}
        <ul className="mt-4 text-xs text-gray-500 space-y-1">
          <li>• 3-20 characters</li>
          <li>• Letters, numbers, and underscores only</li>
          <li>• No spaces or special characters</li>
        </ul>

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Username"
            )}
          </button>

          {saveSuccess && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Username saved!
            </span>
          )}

          {saveError && (
            <span className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
