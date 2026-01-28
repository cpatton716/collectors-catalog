"use client";

import { useState } from "react";

import {
  CheckCircle,
  Clock,
  Eye,
  Flag,
  Loader2,
  ShieldAlert,
  ShieldX,
  XCircle,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Report data as returned from the admin API
 * Uses snake_case to match database column names
 */
export interface Report {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  messages: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
  reporter: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
}

export interface ReportCardProps {
  report: Report;
  onAction: (id: string, status: string, notes?: string) => void;
  updating: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: Report["status"] }) {
  switch (status) {
    case "pending":
      return (
        <span className="badge-pop badge-pop-yellow">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    case "reviewed":
      return (
        <span className="badge-pop badge-pop-blue">
          <Eye className="w-3 h-3" />
          Reviewed
        </span>
      );
    case "actioned":
      return (
        <span className="badge-pop badge-pop-green">
          <CheckCircle className="w-3 h-3" />
          Actioned
        </span>
      );
    case "dismissed":
      return (
        <span className="badge-pop" style={{ background: "#ccc" }}>
          <XCircle className="w-3 h-3" />
          Dismissed
        </span>
      );
    default:
      return null;
  }
}

function ReasonBadge({ reason }: { reason: string }) {
  const colors: Record<string, string> = {
    spam: "var(--pop-yellow)",
    harassment: "var(--pop-red)",
    inappropriate: "var(--pop-red)",
    scam: "var(--pop-red)",
    other: "var(--pop-blue)",
  };

  return (
    <span className="badge-pop text-xs" style={{ background: colors[reason] || colors.other }}>
      {reason.charAt(0).toUpperCase() + reason.slice(1)}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReportCard({ report, onAction, updating }: ReportCardProps) {
  const [adminNotes, setAdminNotes] = useState(report.admin_notes || "");
  const [showActions, setShowActions] = useState(false);

  const isPending = report.status === "pending";

  return (
    <div
      className="comic-panel overflow-hidden"
      style={{
        borderColor: isPending ? "var(--pop-yellow)" : undefined,
        borderWidth: isPending ? "3px" : undefined,
      }}
    >
      {/* Header */}
      <div
        className="p-3 border-b-2 border-black flex items-center justify-between"
        style={{ background: isPending ? "var(--pop-yellow)" : "#f5f5f5" }}
      >
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4" />
          <span className="font-bold text-sm">Report #{report.id.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          <ReasonBadge reason={report.reason} />
          <StatusBadge status={report.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Reported Message */}
        <div>
          <p className="text-xs text-gray-500 mb-1 font-bold">Reported Message:</p>
          {report.messages ? (
            <div
              className="p-3 border-2 border-black rounded"
              style={{ background: "var(--pop-cream)" }}
            >
              <p className="text-sm">{report.messages.content}</p>
              <p className="text-xs text-gray-500 mt-2">
                Sent: {formatDateTime(report.messages.created_at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Message not available</p>
          )}
        </div>

        {/* Report Details */}
        {report.details && (
          <div>
            <p className="text-xs text-gray-500 mb-1 font-bold">Reporter Notes:</p>
            <p className="text-sm bg-gray-100 p-2 rounded border border-gray-300">
              {report.details}
            </p>
          </div>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <div>
            <span className="font-bold">Reporter:</span>{" "}
            {report.reporter?.display_name || report.reporter?.email || "Unknown"}
          </div>
          <div>
            <span className="font-bold">Reported:</span> {formatDateTime(report.created_at)}
          </div>
          {report.reviewed_at && (
            <div>
              <span className="font-bold">Reviewed:</span> {formatDateTime(report.reviewed_at)}
            </div>
          )}
        </div>

        {/* Admin Notes (if reviewed) */}
        {report.admin_notes && report.status !== "pending" && (
          <div>
            <p className="text-xs text-gray-500 mb-1 font-bold">Admin Notes:</p>
            <p className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
              {report.admin_notes}
            </p>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="pt-3 border-t-2 border-black">
            {!showActions ? (
              <button
                onClick={() => setShowActions(true)}
                className="btn-pop btn-pop-blue text-sm w-full"
              >
                <ShieldAlert className="w-4 h-4" />
                Take Action
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Admin Notes (optional):</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    className="input-pop text-sm h-20 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAction(report.id, "dismissed", adminNotes)}
                    disabled={updating}
                    className="flex-1 btn-pop text-sm disabled:opacity-50"
                    style={{ background: "#ccc" }}
                  >
                    {updating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Dismiss
                  </button>
                  <button
                    onClick={() => onAction(report.id, "reviewed", adminNotes)}
                    disabled={updating}
                    className="flex-1 btn-pop btn-pop-blue text-sm disabled:opacity-50"
                  >
                    {updating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => onAction(report.id, "actioned", adminNotes)}
                    disabled={updating}
                    className="flex-1 btn-pop btn-pop-green text-sm disabled:opacity-50"
                  >
                    {updating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Warn User
                  </button>
                </div>
                <button
                  disabled
                  className="w-full btn-pop btn-pop-red text-sm opacity-50 cursor-not-allowed"
                  title="Suspend functionality coming soon"
                >
                  <ShieldX className="w-4 h-4" />
                  Suspend User (Coming Soon)
                </button>
                <button
                  onClick={() => setShowActions(false)}
                  className="w-full text-sm text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
