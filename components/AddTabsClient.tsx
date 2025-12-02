"use client";

import { Suspense, useEffect, useState } from "react";
import { AddManual } from "@/components/AddManual";
import { BarcodeAdd } from "@/components/BarcodeAdd";
import { ReceiptAdd } from "@/components/ReceiptAdd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { StorageLocation } from "@/types";

interface AddTabsClientProps {
  storageLocations: StorageLocation[];
}

const RELEASE_LABEL = "CookSnap · Beta v1.3";

export function AddTabsClient({ storageLocations }: AddTabsClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const loadingContent = (
    <div className="space-y-2">
      <Button disabled className="w-full">
        Loading add tools…
      </Button>
      <p className="text-center text-xs text-[rgb(var(--muted-foreground))]">{RELEASE_LABEL}</p>
    </div>
  );

  if (!mounted) {
    return loadingContent;
  }

  return (
    <Tabs defaultValue="barcode" className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/15 p-6">
      <TabsList>
        <TabsTrigger value="barcode">Barcode</TabsTrigger>
        <TabsTrigger value="receipt">Receipt OCR</TabsTrigger>
        <TabsTrigger value="manual">Manual</TabsTrigger>
      </TabsList>
      <TabsContent value="barcode">
        <Suspense fallback={loadingContent}>
          <BarcodeAdd />
        </Suspense>
      </TabsContent>
      <TabsContent value="receipt">
        <ReceiptAdd />
      </TabsContent>
      <TabsContent value="manual">
        <AddManual initialStorages={storageLocations} />
      </TabsContent>
    </Tabs>
  );
}
