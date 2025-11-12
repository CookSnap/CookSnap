"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReceiptAdd() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[rgb(var(--muted-foreground))]">
        Upload a receipt image and confirm each detected line before importing to the pantry.
      </p>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setFileName(file ? file.name : null);
        }}
      />
      {fileName ? <p className="text-xs text-[rgb(var(--muted-foreground))]">Ready to process {fileName}</p> : null}
      <Button disabled={!fileName}>Process receipt</Button>
    </div>
  );
}
