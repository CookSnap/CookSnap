"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BarcodeAdd() {
  const [scanning, setScanning] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[rgb(var(--muted-foreground))]">
        Point your camera at a barcode. We’ll look up the item and auto-fill the form.
      </p>
      <Button onClick={() => setScanning((value) => !value)}>{scanning ? "Stop scanning" : "Start scanning"}</Button>
      {scanning ? <div className="h-48 rounded-2xl border border-dashed border-[rgb(var(--border))]" /> : null}
    </div>
  );
}
