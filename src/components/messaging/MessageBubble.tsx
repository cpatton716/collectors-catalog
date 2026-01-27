"use client";

import { Message } from "@/types/messaging";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const formattedDate = new Date(message.createdAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 ${
          isOwnMessage
            ? "bg-pop-blue text-white"
            : "border-2 border-pop-black bg-pop-white"
        }`}
      >
        {/* Listing context badge */}
        {message.listing && (
          <div
            className={`mb-1 text-xs ${
              isOwnMessage ? "text-blue-100" : "text-gray-500"
            }`}
          >
            Re: {message.listing.title}
          </div>
        )}

        {/* Message content */}
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>

        {/* Timestamp */}
        <p
          className={`mt-1 text-xs ${
            isOwnMessage ? "text-blue-100" : "text-gray-400"
          }`}
        >
          {formattedDate} at {formattedTime}
        </p>
      </div>
    </div>
  );
}
