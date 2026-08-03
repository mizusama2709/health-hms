"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Plain JPG/PNG display — these are already-rendered photos, not raw
 * modality pixel data, so there's no DICOM-style window/level to apply.
 * The browser decodes them natively; zoom is a CSS scale over the real
 * decoded image, never a re-render, so what's on screen is always exactly
 * the uploaded file.
 */
export function ImageViewer({ instanceId }: { instanceId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/imaging/${instanceId}/url`);
        if (!res.ok) throw new Error("Failed to get a viewing URL for this image");
        const { url } = await res.json();
        if (!cancelled) setUrl(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  if (error) return <p className="text-sm text-destructive">Couldn&apos;t load this image: {error}</p>;
  if (!url) return <p className="text-sm text-muted-foreground">Loading image…</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
          Zoom out
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
          Zoom in
        </Button>
        <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
      </div>
      <div className="aspect-square w-full max-w-[512px] overflow-auto bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Uploaded imaging file"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left", display: "block" }}
        />
      </div>
    </div>
  );
}
