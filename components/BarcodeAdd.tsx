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
  // Prefer self-hosted API route to avoid CSP/CDN/offline issues (serves identity/no-gzip)
  "/zxing-wasm?v=8",
  // Fallback CDN in case self-hosted is unavailable
  "https://cdn.jsdelivr.net/npm/zxing-wasm@2.2.2/dist/reader/zxing_reader.wasm",
];
const ZXING_MAGIC_BYTES = new Uint8Array([0x00, 0x61, 0x73, 0x6d]);
const FORCE_WASM_STORAGE_KEY = "cook_snap_force_wasm";

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
  const [mounted, setMounted] = useState(false);
  const [forceWasm, setForceWasm] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zxingReadyRef = useRef<Promise<void> | null>(null);
  const zxingUrlRef = useRef<string | null>(null);
  const zxingSourceRef = useRef<string | null>(null);
  const zxingFailedRef = useRef(false);
  const detectionFrameCountRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const forceParam = params.get("forceWasm");
    const forceFromParam = forceParam === "1" || forceParam === "true";

    if (forceParam === "0") {
      window.localStorage?.removeItem(FORCE_WASM_STORAGE_KEY);
      setForceWasm(false);
      return;
    }

    if (forceFromParam) {
      window.localStorage?.setItem(FORCE_WASM_STORAGE_KEY, "1");
      setForceWasm(true);
      return;
    }

    const storedForce = window.localStorage?.getItem(FORCE_WASM_STORAGE_KEY) === "1";
    setForceWasm(storedForce);
  }, []);

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

  const ensureZXingReady = useCallback(async (): Promise<void> => {
    if (!zxingReadyRef.current) {
      zxingFailedRef.current = false;
      const loader = (async () => {
        let lastError: Error | null = null;

        for (const candidate of ZXING_WASM_SOURCES) {
          try {
            const response = await fetch(candidate, { method: "GET", cache: "no-store" });
            const contentType = response.headers.get("content-type") ?? "";
            const contentEncoding = response.headers.get("content-encoding") ?? "identity";
            if (!response.ok || !contentType.includes("application/wasm")) {
              throw new Error(`Unexpected response (${contentType || "no content-type"}; encoding=${contentEncoding})`);
            }

            const buffer = await response.arrayBuffer();
            const header = new Uint8Array(buffer.slice(0, 4));
            const isWasm = header.length === ZXING_MAGIC_BYTES.length && header.every((byte, index) => byte === ZXING_MAGIC_BYTES[index]);
            if (!isWasm) {
              throw new Error(`Invalid WASM payload (${contentType}; encoding=${contentEncoding})`);
            }
            if (contentEncoding && contentEncoding !== "identity") {
              console.warn(`WASM response had content-encoding=${contentEncoding}, proceeding because magic bytes matched`);
            }

            const blobUrl = URL.createObjectURL(new Blob([buffer], { type: "application/wasm" }));

            await prepareZXingModule({
              overrides: {
                locateFile: () => blobUrl,
              },
              fireImmediately: true,
            });

            zxingUrlRef.current = blobUrl;
            zxingSourceRef.current = candidate;
            return;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error("Unable to load scanner fallback");
            console.error(`ZXing load failed for ${candidate}`, lastError);
          }
        }

        zxingUrlRef.current = null;
        throw lastError ?? new Error("Unable to load scanner fallback");
      })();

      zxingReadyRef.current = loader
        .then(() => undefined)
        .catch((error) => {
          zxingFailedRef.current = true;
          const message = error instanceof Error ? error.message : "Unable to load scanner fallback";
          const source = zxingSourceRef.current ?? zxingUrlRef.current ?? "unknown source";
          setCameraError(`${message} (${source})`);
          throw error;
        });
    }

    const readyPromise = zxingReadyRef.current;
    if (!readyPromise) {
      throw new Error("Unable to load scanner fallback");
    }

    return readyPromise;
  }, []);

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

    const friendlyCameraError = (error: unknown) => {
      if (!(error instanceof Error)) return "Camera unavailable. Check permissions and try again.";
      const name = (error as DOMException).name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        return "Camera access was blocked. Please allow camera permissions and retry.";
      }
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        return "No suitable camera found. Try switching cameras or another device.";
      }
      if (name === "NotReadableError") {
        return "Camera is in use by another app. Close it and retry.";
      }
      return error.message || "Camera unavailable. Check permissions and try again.";
    };

    async function startCamera() {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera API is not supported in this browser");
        setScanning(false);
        return;
      }
      setCameraError(null);

      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        { video: true, audio: false },
      ];

      try {
        let nextStream: MediaStream | null = null;
        let lastError: unknown;

        for (const constraints of attempts) {
          try {
            nextStream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!nextStream) {
          throw lastError ?? new Error("Camera unavailable");
        }

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
        setCameraError(friendlyCameraError(err));
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

    const useNativeDetector = !forceWasm && "BarcodeDetector" in window;
    const video = videoRef.current as (HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    }) | null;
    if (!video) {
      return;
    }

    if (useNativeDetector && !detectorRef.current) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : "Unable to start barcode detector");
      }
    }

    // Prepare ZXing even when native is present so fallback is available immediately.
    if (!zxingReadyRef.current) {
      void ensureZXingReady().catch(() => undefined);
    }

    let cancelled = false;
    let rafId: number | null = null;

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

      if (useNativeDetector && detectorRef.current) {
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

      if (zxingFailedRef.current) {
        if (!useNativeDetector) {
          setScanning(false);
        } else {
          scheduleNext();
        }
        return;
      }

      try {
        await ensureZXingReady();
      } catch (err) {
        console.error("ZXing init failed", err);
        if (!useNativeDetector) {
          setScanning(false);
        } else {
          scheduleNext();
        }
        return;
      }

      try {
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
  }, [ensureZXingReady, forceWasm, runLookup, scanning]);

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

  if (!mounted) {
    return null;
  }

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
