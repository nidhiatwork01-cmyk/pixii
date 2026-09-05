"use client";

import { useEffect, useRef, useState } from "react";
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
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const systemCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-populate cameras on modal mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        if (videoDevices.length > 0) {
          const list = videoDevices.map((d, i) => ({
            id: d.deviceId,
            label: d.label || `Camera ${i + 1}`,
          }));
          setAvailableCameras(list);
          const integrated = list.find((c) => {
            const l = c.label.toLowerCase();
            return (
              (l.includes("integrated") || l.includes("built-in") || l.includes("webcam") || l.includes("camera")) &&
              !l.includes("virtual")
            );
          });
          if (integrated) setSelectedCameraId(integrated.id);
        }
      }).catch(() => {});
    }
  }, []);

  // Stop camera stream safely
  function stopCameraStream() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }

  // Start native camera stream
  async function startNativeCamera(cameraId?: string) {
    try {
      setErrorMessage("");
      setScanStatus("Connecting camera...");
      stopCameraStream();

      // Check support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      const targetId = cameraId || selectedCameraId;
      let stream: MediaStream | null = null;

      try {
        const constraints: MediaStreamConstraints = {
          video: targetId ? { deviceId: { ideal: targetId } } : true,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (specificErr) {
        console.warn("Specific camera failed, trying simple video: true fallback...", specificErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (!stream) {
        throw new Error("Could not acquire video stream.");
      }

      streamRef.current = stream;

      // Attach immediately to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        await videoRef.current.play().catch(() => {});
      }

      // Enumerate devices to populate camera selector with full labels
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        const cameraList = videoDevices.map((d, i) => ({
          id: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
        setAvailableCameras(cameraList);

        const activeTrack = stream.getVideoTracks()[0];
        const activeDeviceId = activeTrack?.getSettings()?.deviceId || targetId || cameraList[0]?.id;
        if (activeDeviceId) {
          setSelectedCameraId(activeDeviceId);
        }
      } catch (enumErr) {
        console.warn("Error enumerating devices:", enumErr);
      }

      setIsScanning(true);
      setScanStatus("Point at barcode or click 'Snap & AI Identify'");

      // Setup BarcodeDetector if available
      initBarcodeDetector();
    } catch (err: any) {
      console.warn("Camera init failed:", err);
      setIsScanning(false);
      setErrorMessage(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Click the lock icon in Chrome to allow camera access."
          : (err.message || "Failed to initialize camera.")
      );
    }
  }

  // BarcodeDetector automatic background loop
  function initBarcodeDetector() {
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      console.log("Native BarcodeDetector not available in this browser. Use Snap & Identify or Upload.");
      return;
    }

    try {
      const detector = new (window as any).BarcodeDetector({
        formats: [
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "code_128",
          "code_39",
          "qr_code",
        ],
      });

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw) {
              handleBarcodeDetected(raw);
            }
          }
        } catch {
          // ignore transient detection frame errors
        }
      }, 500);
    } catch (e) {
      console.warn("BarcodeDetector setup error:", e);
    }
  }

  // Switch camera dropdown
  async function handleCameraChange(newId: string) {
    setSelectedCameraId(newId);
    stopCameraStream();
    setTimeout(() => {
      startNativeCamera(newId);
    }, 100);
  }

  // Lifecycle
  useEffect(() => {
    if (isOpen && activeTab === "camera") {
      const timer = setTimeout(() => {
        startNativeCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCameraStream();
      };
    } else {
      stopCameraStream();
    }
  }, [isOpen, activeTab]);

  // Handle scanned or entered barcode
  async function handleBarcodeDetected(barcode: string) {
    stopCameraStream();
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

  // Snap current camera frame and send to Gemini Vision for instant product identification
  async function handleSnapAndIdentify() {
    if (!videoRef.current) return;
    try {
      setIsAnalyzing(true);
      setScanStatus("Analyzing photo with AI Vision...");

      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture frame");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL("image/jpeg", 0.85);

      stopCameraStream();

      const res = await fetch("/api/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!res.ok) {
        throw new Error(`Vision API error: ${res.status}`);
      }

      const dossier: ProductDossier = await res.json();
      onDossierReady(dossier);
      onClose();
    } catch (err: any) {
      console.error("Snap identify error:", err);
      setIsAnalyzing(false);
      setErrorMessage(err.message || "Could not analyze snapshot. Please try again.");
    }
  }

  // Handle image upload with Vision fallback
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setScanStatus("Analyzing product image...");
    setIsAnalyzing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch("/api/barcode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Data }),
          });
          if (!res.ok) throw new Error("Could not identify product from image");
          const dossier: ProductDossier = await res.json();
          onDossierReady(dossier);
          onClose();
        } catch (err: any) {
          setIsAnalyzing(false);
          setErrorMessage(err.message || "Failed to identify product from uploaded image.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsAnalyzing(false);
      setErrorMessage("Error reading file. Try a different image or sample barcode.");
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
        {/* Hidden Canvas and Native Camera Capture Input */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={systemCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

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
                <div className="space-y-3">
                  {/* Camera switcher dropdown */}
                  {availableCameras.length > 1 && (
                    <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 px-3 py-2 rounded-xl">
                      <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <span>📷</span> Camera:
                      </span>
                      <select
                        value={selectedCameraId}
                        onChange={(e) => handleCameraChange(e.target.value)}
                        className="bg-[#111116] border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#F5A623] cursor-pointer max-w-[220px] truncate"
                      >
                        {availableCameras.map((cam) => (
                          <option key={cam.id} value={cam.id} className="bg-[#111116] text-white">
                            {cam.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] border border-white/10 flex items-center justify-center">
                    {errorMessage && !isScanning ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
                          📷
                        </div>
                        <div>
                          <p className="font-serif text-sm text-white">Browser Camera In Use or Timed Out</p>
                          <p className="font-sans text-[11px] text-zinc-400 mt-1 max-w-xs">
                            Windows camera driver is busy. You can snap a photo with your device camera or scout an instant sample:
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center pt-1">
                          <button
                            type="button"
                            onClick={() => systemCameraInputRef.current?.click()}
                            className="px-4 py-2 rounded-xl bg-[#F5A623] hover:bg-[#FBBF24] font-sans text-xs font-bold text-black uppercase tracking-wider transition-all shadow-md active:scale-98"
                          >
                            📸 Snap Photo (Camera)
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("samples")}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-sans text-xs uppercase tracking-wider transition-all"
                          >
                            ⚡ Instant Samples
                          </button>
                          <button
                            type="button"
                            onClick={() => startNativeCamera()}
                            className="px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white font-sans text-xs transition-all"
                          >
                            🔄 Retry
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Scanning reticle overlay */}
                        {isScanning && (
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-36 border-2 border-[#F5A623]/60 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(245,166,35,0.2)]">
                              {/* Animated laser beam */}
                              <div className="absolute top-0 left-0 w-full h-0.5 bg-[#F5A623] animate-pulse shadow-[0_0_10px_#F5A623]" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Quick Snap Button */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={isScanning ? handleSnapAndIdentify : () => systemCameraInputRef.current?.click()}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#22D3EE]/20 via-[#F5A623]/20 to-[#6366F1]/20 hover:from-[#22D3EE]/30 hover:to-[#6366F1]/30 border border-[#F5A623]/40 rounded-xl text-white font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                    >
                      <span>📸</span> {isScanning ? "Snap & AI Identify Product" : "Take / Upload Photo with Camera"}
                    </button>
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
                  <label className="border-2 border-dashed border-white/10 hover:border-[#F5A623]/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03]">
                    <span className="text-3xl mb-2">📸</span>
                    <p className="font-serif text-base text-white">Drop or Select Product Photo</p>
                    <p className="font-sans text-xs text-zinc-500 mt-1">
                      Upload a photo of any product barcode or retail packaging
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
