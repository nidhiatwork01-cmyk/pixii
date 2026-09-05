"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ProductDossier } from "@/app/api/barcode/route";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDossierReady: (dossier: ProductDossier) => void;
}

const SAMPLE_PRODUCTS = [
  {
    name: "Beauty of Joseon Sunscreen",
    barcode: "8809647153826",
    tag: "K-Beauty Sunscreen",
  },
  {
    name: "COSRX Snail Mucin 96",
    barcode: "8809598453472",
    tag: "Hydrating Serum",
  },
  {
    name: "CeraVe Moisturizing Cream",
    barcode: "3606000537460",
    tag: "Ceramide Cream",
  },
  {
    name: "Optimum Nutrition Gold Whey",
    barcode: "748927028669",
    tag: "Protein Powder",
  },
  {
    name: "ISDIN Eryfotona Sunscreen",
    barcode: "8432945000000",
    tag: "Amazon #1 BSR",
  },
];

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onDossierReady,
}: BarcodeScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "samples">("camera");
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [scanStatus, setScanStatus] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "pixii-barcode-reader";

  // Start live camera
  async function startCamera() {
    try {
      setErrorMessage("");
      setScanStatus("Initializing camera...");

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId);
      }

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("No cameras detected on this device. You can use Photo Upload or Sample Barcodes.");
      }

      // Prefer back camera on mobile
      const cameraId = devices[devices.length - 1].id;

      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 160 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // ignore scan frame misses
        }
      );

      setIsScanning(true);
      setScanStatus("Align barcode within the frame");
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setIsScanning(false);
      setErrorMessage(
        err.message?.includes("NotAllowedError") || err.message?.includes("Permission")
          ? "Camera permission denied. Please allow camera access in your browser, or use Photo Upload."
          : (err.message || "Failed to start camera. Please try Photo Upload or Sample Barcodes.")
      );
    }
  }

  // Stop camera
  async function stopCamera() {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Camera stop error:", e);
      }
      setIsScanning(false);
    }
  }

  useEffect(() => {
    if (isOpen && activeTab === "camera") {
      const timer = setTimeout(() => {
        startCamera();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab]);

  // Handle scanned barcode
  async function handleBarcodeDetected(barcode: string) {
    await stopCamera();
    setIsAnalyzing(true);
    setErrorMessage("");
    setScanStatus(`Scanned: ${barcode}. Consulting AI engines...`);

    try {
      const res = await fetch("/api/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const dossier: ProductDossier = await res.json();
      onDossierReady(dossier);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze barcode.");
      setIsAnalyzing(false);
    }
  }

  // Handle image upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setScanStatus("Scanning uploaded image for barcode...");
    setIsAnalyzing(true);

    try {
      const html5QrCode = new Html5Qrcode("upload-scanner-helper");
      const decodedText = await html5QrCode.scanFile(file, false);
      await html5QrCode.clear();
      handleBarcodeDetected(decodedText);
    } catch (err: any) {
      setIsAnalyzing(false);
      setErrorMessage("No clear barcode detected in the uploaded image. Please try another photo or use a sample barcode.");
    }
  }

  // Handle manual submit
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0F0F14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#22D3EE] via-[#F5A623] to-[#6366F1]" />

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
            <h3 className="font-serif text-xl text-white">Pixii Lens — Barcode Scanner</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xl leading-none px-2 py-1 rounded"
          >
            &times;
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 border-b border-white/5 bg-black/40 text-center">
          <button
            onClick={() => setActiveTab("camera")}
            className={`py-3 font-sans text-xs uppercase tracking-widest transition-all ${
              activeTab === "camera"
                ? "text-[#F5A623] border-b-2 border-[#F5A623] font-bold bg-white/[0.02]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            📷 Live Camera
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`py-3 font-sans text-xs uppercase tracking-widest transition-all ${
              activeTab === "upload"
                ? "text-[#F5A623] border-b-2 border-[#F5A623] font-bold bg-white/[0.02]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            📁 Upload Photo
          </button>
          <button
            onClick={() => setActiveTab("samples")}
            className={`py-3 font-sans text-xs uppercase tracking-widest transition-all ${
              activeTab === "samples"
                ? "text-[#F5A623] border-b-2 border-[#F5A623] font-bold bg-white/[0.02]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            ⚡ Samples
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Analyzing Spinner Overlay */}
          {isAnalyzing ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-10 h-10 border-2 border-white/10 border-t-[#F5A623] rounded-full animate-spin" />
              <div>
                <p className="font-serif text-lg text-white">Consulting AI Engines</p>
                <p className="font-sans text-xs text-zinc-500 mt-1">
                  Cross-referencing Gemini, Claude & Amazon BSR...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Camera Tab */}
              {activeTab === "camera" && (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] border border-white/10 flex items-center justify-center">
                    <div id={readerElementId} className="w-full h-full" />

                    {/* Scanning reticle overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-64 h-36 border-2 border-[#F5A623]/60 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(245,166,35,0.2)]">
                          {/* Animated laser beam */}
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-[#F5A623] animate-pulse shadow-[0_0_10px_#F5A623]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {scanStatus && (
                    <p className="font-sans text-[11px] text-zinc-400 text-center uppercase tracking-wider">
                      {scanStatus}
                    </p>
                  )}
                </div>
              )}

              {/* Upload Photo Tab */}
              {activeTab === "upload" && (
                <div className="space-y-4">
                  <div id="upload-scanner-helper" className="hidden" />
                  <label className="border-2 border-dashed border-white/10 hover:border-[#F5A623]/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03]">
                    <span className="text-3xl mb-2">📸</span>
                    <p className="font-serif text-base text-white">Drop or Select Product Photo</p>
                    <p className="font-sans text-xs text-zinc-500 mt-1">
                      Upload a photo of a barcode from your phone or desktop
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Sample Products Tab */}
              {activeTab === "samples" && (
                <div className="space-y-3">
                  <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">
                    Instant Test Barcodes (Click to Scout)
                  </p>
                  <div className="space-y-2">
                    {SAMPLE_PRODUCTS.map((prod) => (
                      <button
                        key={prod.barcode}
                        onClick={() => handleBarcodeDetected(prod.barcode)}
                        className="w-full p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/20 transition-all flex items-center justify-between text-left group"
                      >
                        <div>
                          <p className="font-serif text-sm text-white group-hover:text-[#F5A623] transition-colors">
                            {prod.name}
                          </p>
                          <p className="font-mono text-[9px] text-zinc-600 mt-0.5">
                            UPC: {prod.barcode}
                          </p>
                        </div>
                        <span className="font-sans text-[9px] uppercase tracking-wider text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full shrink-0">
                          {prod.tag}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {errorMessage && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-sans text-xs text-center">
                  {errorMessage}
                </div>
              )}

              {/* Manual Barcode Input Fallback */}
              <form onSubmit={handleManualSubmit} className="mt-6 pt-5 border-t border-white/5">
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">
                  Or enter UPC / EAN manually
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. 8809647153826"
                    className="flex-1 bg-[#111116] border border-white/10 rounded-xl px-3.5 py-2 font-mono text-xs text-white placeholder:text-zinc-700 outline-none focus:border-[#F5A623]/40"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="px-4 py-2 rounded-xl bg-[#F5A623] disabled:opacity-40 font-sans text-[10px] font-bold uppercase tracking-widest text-black shadow-md hover:bg-[#FBBF24] transition-all"
                  >
                    Scan →
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
