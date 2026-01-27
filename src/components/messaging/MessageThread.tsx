"use client";

import { useEffect, useRef, useState } from "react";

import { Loader2 } from "lucide-react";

import { Message, MessagesResponse } from "@/types/messaging";
import { SellerProfile } from "@/types/auction";

import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  onMessageSent?: () => void;
}

export function MessageThread({
  conversationId,
  currentUserId,
  onMessageSent,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherParticipant, setOtherParticipant] = useState<SellerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/messages/${conversationId}`);
      if (!response.ok) {
        throw new Error("Failed to load messages");
      }
      const data: MessagesResponse = await response.json();
      setMessages(data.messages);
      setOtherParticipant(data.otherParticipant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!otherParticipant) return;

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: otherParticipant.id,
        content,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to send message");
    }

    const { message } = await response.json();
    setMessages((prev) => [...prev, message]);
    onMessageSent?.();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pop-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <div>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadMessages}
            className="mt-2 text-sm text-pop-blue hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with participant info */}
      {otherParticipant && (
        <div className="border-b-2 border-pop-black bg-pop-white px-4 py-3">
          <p className="font-bold">
            {otherParticipant.username
              ? `@${otherParticipant.username}`
              : otherParticipant.displayName || "User"}
          </p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">
            No messages yet. Send one to start the conversation!
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.senderId === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <MessageComposer onSend={handleSendMessage} />
    </div>
  );
}
