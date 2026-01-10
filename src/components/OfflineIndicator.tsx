"use client";

import { WifiOff, CloudOff, Check, AlertCircle } from "lucide-react";

interface OfflineIndicatorProps {
  pendingCount?: number;
  syncResult?: { synced: number; failed: number } | null;
}

export function OfflineIndicator({ pendingCount = 0, syncResult }: OfflineIndicatorProps) {
  return (
    <div className="bg-amber-600 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">Offline Mode</span>
      </div>
      {pendingCount > 0 && (
        <div className="flex items-center gap-1.5">
          <CloudOff className="w-3.5 h-3.5 text-white/80" />
          <span className="text-xs text-white/80">
            {pendingCount} pending
          </span>
        </div>
      )}
      {syncResult && syncResult.synced > 0 && (
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-green-300" />
          <span className="text-xs text-white/80">
            {syncResult.synced} synced
          </span>
        </div>
      )}
      {syncResult && syncResult.failed > 0 && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-300" />
          <span className="text-xs text-white/80">
            {syncResult.failed} failed
          </span>
        </div>
      )}
    </div>
  );
}

interface SyncNotificationProps {
  synced: number;
  failed: number;
  onDismiss: () => void;
}

export function SyncNotification({ synced, failed, onDismiss }: SyncNotificationProps) {
  if (synced === 0 && failed === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
        <div className="flex items-start gap-3">
          {failed === 0 ? (
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-green-400" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {failed === 0 ? "Sync Complete" : "Sync Completed with Errors"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {synced > 0 && `${synced} item${synced !== 1 ? "s" : ""} synced`}
              {synced > 0 && failed > 0 && ", "}
              {failed > 0 && `${failed} failed`}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}
