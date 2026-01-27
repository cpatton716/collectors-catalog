"use client";

import { useState } from "react";

import { Loader2, Send } from "lucide-react";

interface MessageComposerProps {
  onSend: (content: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageComposer({
  onSend,
  placeholder = "Type a message...",
  disabled = false,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSend(trimmedContent);
      setContent("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift for newline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t-2 border-pop-black bg-pop-white p-3">
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-lg border-2 border-pop-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pop-blue disabled:opacity-50"
          style={{ minHeight: "40px", maxHeight: "120px" }}
        />
        <button
          type="submit"
          disabled={!content.trim() || isSending || disabled}
          className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-pop-black bg-pop-blue text-white transition-all hover:shadow-[2px_2px_0px_#000] disabled:opacity-50 disabled:hover:shadow-none"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
