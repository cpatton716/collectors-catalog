"use client";

import { ConversationPreview } from "@/types/messaging";

interface ConversationListProps {
  conversations: ConversationPreview[];
  selectedId?: string;
  onSelect: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No conversations yet</p>
        <p className="mt-1 text-sm">
          Message a seller to start a conversation
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y-2 divide-pop-black">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedId;
        const displayName = conv.otherParticipant.username
          ? `@${conv.otherParticipant.username}`
          : conv.otherParticipant.displayName || "User";

        const timeAgo = getTimeAgo(conv.lastMessageAt);
        const isUnread = conv.unreadCount > 0;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full px-4 py-3 text-left transition-colors ${
              isSelected
                ? "bg-pop-blue/10"
                : "bg-pop-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className={`truncate font-bold ${isUnread ? "text-pop-black" : "text-gray-700"}`}>
                  {displayName}
                </p>
                <p className={`truncate text-sm ${isUnread ? "font-medium text-pop-black" : "text-gray-500"}`}>
                  {conv.lastMessage.content}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-gray-400">{timeAgo}</span>
                {isUnread && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pop-red px-1.5 text-xs font-bold text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
