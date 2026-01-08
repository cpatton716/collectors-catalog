"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

export function BarcodeScanner({ onScan, onClose, isProcessing }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      if (!containerRef.current) return;

      try {
        const scanner = new Html5Qrcode("barcode-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            // Only process UPC/EAN barcodes (typically 12-13 digits)
            if (/^\d{12,13}$/.test(decodedText)) {
              onScan(decodedText);
            }
          },
          () => {
            // Ignore scan failures (no barcode found)
          }
        );

        if (mounted) {
          setIsStarting(false);
        }
      } catch (err) {
        console.error("Error starting barcode scanner:", err);
        if (mounted) {
          setError("Could not access camera. Please ensure camera permissions are granted.");
          setIsStarting(false);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white font-medium">Scan Barcode</h2>
        <button
          onClick={onClose}
          className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          disabled={isProcessing}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {isStarting ? (
          <div className="text-center text-white">
            <Camera className="w-12 h-12 mx-auto mb-4 animate-pulse" />
            <p>Starting camera...</p>
          </div>
        ) : error ? (
          <div className="text-center text-white max-w-sm">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white text-gray-900 rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div
              id="barcode-reader"
              ref={containerRef}
              className="w-full max-w-md rounded-lg overflow-hidden"
            />
            <p className="text-white/70 text-sm mt-4 text-center">
              Position the barcode within the frame
            </p>
          </>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <p>Looking up comic...</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-black/50">
        <p className="text-white/60 text-xs text-center">
          Point your camera at the UPC barcode on the back of the comic
        </p>
      </div>
    </div>
  );
}
