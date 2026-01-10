"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { GRADE_SCALE } from "@/types/comic";

interface GradeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (grade: number) => void;
  comicTitle?: string;
  issueNumber?: string;
  preselectedGrade?: number;
}

// Common grades for quick selection
const QUICK_GRADES = [
  { value: 9.8, label: "NM/M" },
  { value: 9.4, label: "NM" },
  { value: 8.0, label: "VF" },
  { value: 6.0, label: "FN" },
  { value: 4.0, label: "VG" },
  { value: 2.0, label: "GD" },
];

export function GradeSelector({
  isOpen,
  onClose,
  onSelect,
  comicTitle,
  issueNumber,
  preselectedGrade,
}: GradeSelectorProps) {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(
    preselectedGrade ?? null
  );
  const [showAllGrades, setShowAllGrades] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedGrade !== null) {
      onSelect(selectedGrade);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 mx-4 sm:mx-auto mb-20 sm:mb-0">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Select Grade</h2>
              {comicTitle && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {comicTitle}
                  {issueNumber && ` #${issueNumber}`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Quick Grade Selection */}
        <div className="px-6 py-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Select</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_GRADES.map((grade) => (
              <button
                key={grade.value}
                onClick={() => setSelectedGrade(grade.value)}
                className={`py-3 px-4 rounded-xl border-2 transition-all ${
                  selectedGrade === grade.value
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <span className="block text-lg font-bold">{grade.value}</span>
                <span className="block text-xs text-gray-500">{grade.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* All Grades Toggle */}
        <div className="px-6">
          <button
            onClick={() => setShowAllGrades(!showAllGrades)}
            className="text-sm text-primary-600 font-medium hover:text-primary-700"
          >
            {showAllGrades ? "Hide all grades" : "Show all grades"}
          </button>
        </div>

        {/* Full Grade List */}
        {showAllGrades && (
          <div className="px-6 py-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {GRADE_SCALE.map((grade) => (
                <button
                  key={grade.value}
                  onClick={() => setSelectedGrade(parseFloat(grade.value))}
                  className={`py-2 px-3 rounded-lg text-left text-sm transition-all ${
                    selectedGrade === parseFloat(grade.value)
                      ? "bg-primary-100 text-primary-700 font-medium"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {grade.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleConfirm}
            disabled={selectedGrade === null}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
              selectedGrade !== null
                ? "bg-primary-600 text-white hover:bg-primary-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Check className="w-5 h-5" />
            Get Price for {selectedGrade ?? "..."} Grade
          </button>
        </div>

        {/* Safe area padding */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  );
}
