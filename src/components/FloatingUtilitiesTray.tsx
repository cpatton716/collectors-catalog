"use client";

import { useState, useEffect, useRef } from "react";
import { KeyRound, MessageCircleQuestion, X, Plus } from "lucide-react";

interface FloatingUtilitiesTrayProps {
  onKeyHuntClick: () => void;
  onAskProfessorClick: () => void;
}

export function FloatingUtilitiesTray({
  onKeyHuntClick,
  onAskProfessorClick,
}: FloatingUtilitiesTrayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);

  // Close tray when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  const handleKeyHunt = () => {
    setIsExpanded(false);
    onKeyHuntClick();
  };

  const handleAskProfessor = () => {
    setIsExpanded(false);
    onAskProfessorClick();
  };

  return (
    <div
      ref={trayRef}
      className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3"
    >
      {/* Expanded options */}
      {isExpanded && (
        <>
          {/* Ask the Professor */}
          <button
            onClick={handleAskProfessor}
            className="flex items-center gap-3 pl-4 pr-3 py-3 bg-white rounded-full shadow-lg border border-gray-200 animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            <span className="text-sm font-medium text-gray-700">Ask the Professor</span>
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <MessageCircleQuestion className="w-5 h-5 text-white" />
            </div>
          </button>

          {/* Key Hunt */}
          <button
            onClick={handleKeyHunt}
            className="flex items-center gap-3 pl-4 pr-3 py-3 bg-white rounded-full shadow-lg border border-gray-200 animate-in slide-in-from-bottom-2 fade-in duration-150"
          >
            <span className="text-sm font-medium text-gray-700">Key Hunt</span>
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
          </button>
        </>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isExpanded
            ? "bg-gray-800 rotate-45"
            : "bg-primary-600 hover:bg-primary-700"
        }`}
      >
        {isExpanded ? (
          <Plus className="w-6 h-6 text-white" />
        ) : (
          <KeyRound className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}
