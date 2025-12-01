"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";
import type { BarcodeLookupResponse, StorageCategory } from "@/types";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

const UPC_PLACEHOLDER = "012993441012";
const ZXING_WASM_SOURCES = [
  // Prefer self-hosted (place zxing_reader.wasm in /public for CSP/offline friendliness)
  "/zxing_reader.wasm",
  // Fallback CDN
  "https://cdn.jsdelivr.net/npm/zxing-wasm@2.2.2/dist/reader/zxing_reader.wasm",
];

interface BarcodeAddProps {
  defaultStorageId?: string | null;
  defaultStorageCategory?: StorageCategory | null;
}

export function BarcodeAdd({ defaultStorageId = null, defaultStorageCategory = null }: BarcodeAddProps = {}) {
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BarcodeLookupResponse | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zxingReadyRef = useRef<Promise<void> | null>(null);
  const zxingUrlRef = useRef<string | null>(null);
  const detectionFrameCountRef = useRef(0);

  const cleanedValue = useMemo(() => barcode.replace(/\D/g, ""), [barcode]);

  const runLookup = useCallback(
    async (candidate: string, options: { updateInput?: boolean } = {}) => {
      const sanitized = candidate.replace(/\D/g, "");
      if (!sanitized) {
        setError("Enter a UPC or EAN before searching");
        return;
      }
      if (options.updateInput) {
        setBarcode(sanitized);
      }

      setLookupLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch("/api/barcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upc: sanitized }),
        });

        const payload = (await response.json()) as { data?: BarcodeLookupResponse; error?: string };

        if (!payload.data) {
          throw new Error(payload.error ?? "Unable to resolve barcode");
        }

        setResult(payload.data);
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : "Lookup failed");
      } finally {
        setLookupLoading(false);
      }
    },
    []
  );

  const handleLookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runLookup(cleanedValue);
  };

  const barcodeInputId = useId();

  const tags = useMemo(() => {
    if (!result?.product?.categories?.length) return [] as string[];
    return result.product.categories
      .map((category) => category.replace(/^en:/, ""))
      .filter(Boolean)
      .slice(0, 4);
  }, [result]);

  useEffect(() => {
    let cancelled = false;

    const stopStream = () => {
      const tracks = streamRef.current?.getTracks() ?? [];
      for (const track of tracks) {
        track.stop();
      }
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!scanning) {
      stopStream();
      return;
    }

    async function startCamera() {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera API is not supported in this browser");
        setScanning(false);
        return;
      }
      setCameraError(null);
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          for (const track of nextStream.getTracks()) {
            track.stop();
          }
          return;
        }
        streamRef.current = nextStream;
        if (videoRef.current) {
          videoRef.current.srcObject = nextStream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : "Camera unavailable");
        setScanning(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [scanning]);

  useEffect(() => {
    if (!scanning) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const hasNativeDetector = "BarcodeDetector" in window;
    const video = videoRef.current as (HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    }) | null;
    if (!video) {
      return;
    }

    if (hasNativeDetector && !detectorRef.current) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : "Unable to start barcode detector");
      }
    } else if (!hasNativeDetector && !zxingReadyRef.current) {
      const pickWasmUrl = async () => {
        if (zxingUrlRef.current) return zxingUrlRef.current;
        for (const candidate of ZXING_WASM_SOURCES) {
          try {
            const res = await fetch(candidate, { method: "HEAD" });
            if (res.ok) {
              zxingUrlRef.current = candidate;
              return candidate;
            }
          } catch {
            // try next
          }
        }
        // fallback to last even if head requests fail
        zxingUrlRef.current = ZXING_WASM_SOURCES[ZXING_WASM_SOURCES.length - 1];
        return zxingUrlRef.current;
      };

      zxingReadyRef.current = (async () => {
        const wasmUrl = await pickWasmUrl();
        await prepareZXingModule({
          overrides: {
            locateFile: () => wasmUrl,
          },
          fireImmediately: true,
        });
      })().catch((err) => {
        setCameraError(err instanceof Error ? err.message : "Unable to load scanner fallback");
      });
    }

    let cancelled = false;
    let rafId: number | null = null;

    const ensureZXingReady = async () => {
      if (!zxingReadyRef.current) return;
      try {
        await zxingReadyRef.current;
      } catch (err) {
        console.error("ZXing init failed", err);
      }
    };

    const scheduleNext = () => {
      if (cancelled) return;
      if (typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(() => {
          void detectFrame();
        });
      } else {
        rafId = requestAnimationFrame(() => {
          void detectFrame();
        });
      }
    };

    const detectFrame = async () => {
      if (cancelled || !video) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        scheduleNext();
        return;
      }
      detectionFrameCountRef.current += 1;

      if (hasNativeDetector && detectorRef.current) {
        try {
          const detections = await detectorRef.current.detect(video);
          const match = detections.find((item) => item.rawValue);
          if (match?.rawValue) {
            await runLookup(match.rawValue, { updateInput: true });
            setScanning(false);
            return;
          }
          // Also run ZXing every few frames to help older/finicky browsers.
          if (detectionFrameCountRef.current % 8 !== 0) {
            scheduleNext();
            return;
          }
        } catch (err) {
          console.error("Barcode detection failed", err);
        }
      }

      // Fallback: ZXing WASM for browsers without BarcodeDetector.
      try {
        await ensureZXingReady();
        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          scheduleNext();
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const results = await readBarcodes(frame, {
          formats: ["EAN-13", "EAN-8", "UPC-A", "UPC-E"],
          maxNumberOfSymbols: 1,
          tryHarder: true,
        });
        const match = results.find((result) => result.text);
        if (match?.text) {
          await runLookup(match.text, { updateInput: true });
          setScanning(false);
          return;
        }
      } catch (err) {
        console.error("ZXing detection failed", err);
      }

      scheduleNext();
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [runLookup, scanning]);

  const clearResult = useCallback(() => {
    setResult(null);
    setBarcode("");
    setSuccessMessage(null);
    setError(null);
  }, []);

  const handleResultAction = useCallback(async () => {
    if (!result) {
      return;
    }

    if (!result.found || !result.product) {
      clearResult();
      return;
    }

    const itemName = result.product.name?.trim();
    if (!itemName) {
      setError("This UPC is missing a product name. Add it manually instead.");
      return;
    }

    setAddLoading(true);
    setError(null);
    setSuccessMessage(null);

    const derivedCategory = result.product.categories?.[0]?.replace(/^en:/, "") ?? null;
    const payload = {
      name: itemName,
      qty: 1,
      unit: result.product.quantity ?? null,
      category: derivedCategory,
      storage: defaultStorageCategory ?? null,
      storage_location_id: defaultStorageId,
      barcode: result.upc,
      upc_metadata: result.product,
      upc_image_url: result.product.image ?? null,
    };

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to add item");
      }

      await track("add_item", { method: "barcode", upc: result.upc, name: itemName });
      setSuccessMessage(`${itemName} added to your pantry.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setAddLoading(false);
    }
  }, [clearResult, defaultStorageCategory, defaultStorageId, result]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[rgb(var(--muted-foreground))]">
        Aim your camera at a barcode to auto-fill the manual form, or paste a UPC/EAN below to test the lookup service.
      </p>
      <Button onClick={() => setScanning((value) => !value)}>{scanning ? "Stop scanning" : "Start scanning"}</Button>
      {scanning ? (
        <div className="relative h-48 overflow-hidden rounded-2xl border border-dashed border-[rgb(var(--border))] bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-52 rounded-lg border-2 border-rose-500/80 bg-rose-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        </div>
      ) : null}
      {cameraError ? <p className="text-sm text-rose-400">Camera error: {cameraError}</p> : null}

      <form className="space-y-3" onSubmit={handleLookup}>
        <div className="grid gap-2">
          <Label htmlFor={barcodeInputId}>UPC / EAN digits</Label>
          <div className="flex gap-2">
            <Input
              id={barcodeInputId}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={UPC_PLACEHOLDER}
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
            />
            <Button type="submit" disabled={lookupLoading} className="shrink-0">
              {lookupLoading ? "Looking…" : "Lookup"}
            </Button>
          </div>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">We support UPC-A, EAN-8, EAN-13, and GTIN-14.</p>
        </div>
      </form>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {result ? (
        <div className="space-y-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[rgb(var(--muted-foreground))]">{result.cached ? "Cached" : "Fresh"} · {result.source}</p>
              <p className="text-lg font-semibold">{result.product?.name ?? "No match yet"}</p>
              {result.product?.brand ? <p className="text-sm text-[rgb(var(--muted-foreground))]">{result.product.brand}</p> : null}
            </div>
            {result.product?.image ? (
              <Image
                src={result.product.image}
                alt={result.product.name ?? "Product"}
                width={128}
                height={128}
                unoptimized
                className="h-32 w-32 rounded-xl object-cover"
              />
            ) : null}
            <div className="text-sm text-[rgb(var(--muted-foreground))]">
              <p>UPC: {result.upc}</p>
              <p>Refreshed: {new Date(result.refreshedAt).toLocaleString()}</p>
            </div>
            {tags.length ? (
              <div className="flex flex-wrap gap-2 text-xs text-[rgb(var(--muted-foreground))]">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5">
                    {tag.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            ) : null}
            {!result.found ? <p className="text-sm text-amber-400">We couldn’t find this code on Open Food Facts. Add it manually and we’ll cache it the next time.</p> : null}
            <div className="flex gap-2">
              <Button onClick={() => void handleResultAction()} disabled={addLoading} className="flex-1">
                {result.found ? (addLoading ? "Adding…" : "Add item") : "Clear"}
              </Button>
              {result.found ? (
                <Button variant="outline" onClick={() => clearResult()} disabled={addLoading}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {successMessage ? <p className="text-sm text-emerald-400">{successMessage}</p> : null}
    </div>
  );
}
