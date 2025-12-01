"use client";

import { Suspense } from "react";
import { AddManual } from "@/components/AddManual";
import { BarcodeAdd } from "@/components/BarcodeAdd";
import { ReceiptAdd } from "@/components/ReceiptAdd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { StorageLocation } from "@/types";

interface AddTabsClientProps {
  storageLocations: StorageLocation[];
}

export function AddTabsClient({ storageLocations }: AddTabsClientProps) {
  return (
    <Tabs defaultValue="barcode" className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/15 p-6">
      <TabsList>
        <TabsTrigger value="barcode">Barcode</TabsTrigger>
        <TabsTrigger value="receipt">Receipt OCR</TabsTrigger>
        <TabsTrigger value="manual">Manual</TabsTrigger>
      </TabsList>
      <TabsContent value="barcode">
        <Suspense fallback={<Button disabled>Loading scanner…</Button>}>
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
