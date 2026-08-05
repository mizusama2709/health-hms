"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Renders an uploaded PDF report page-by-page via pdf.js — a document, not
 * an image, so it gets page navigation instead of a DICOM-style viewport.
 */
export function PdfViewer({ instanceId }: { instanceId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "rendered" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const pdfDocRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/imaging/${instanceId}/url`);
        if (!res.ok) throw new Error("Failed to get a viewing URL for this PDF");
        const { url } = await res.json();

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const pdf = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        await renderPage(1);
        if (!cancelled) setStatus("rendered");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    }

    async function renderPage(n: number) {
      const pdf = pdfDocRef.current;
      if (!pdf || !canvasRef.current) return;
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d")!;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  useEffect(() => {
    if (status !== "rendered" || !pdfDocRef.current || !canvasRef.current) return;
    (async () => {
      const page = await pdfDocRef.current!.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d")!;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
    })();
  }, [pageNum, status]);

  if (status === "error") return <p className="text-sm text-destructive">Couldn&apos;t load this PDF: {error}</p>;

  return (
    <div className="flex flex-col gap-2">
      {status === "loading" && <p className="text-sm text-muted-foreground">Loading PDF…</p>}
      {numPages > 1 && (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={pageNum <= 1} onClick={() => setPageNum((n) => n - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {pageNum} of {numPages}
          </span>
          <Button type="button" size="sm" variant="outline" disabled={pageNum >= numPages} onClick={() => setPageNum((n) => n + 1)}>
            Next
          </Button>
        </div>
      )}
      <canvas ref={canvasRef} className="border border-border" style={{ maxWidth: "100%" }} />
    </div>
  );
}
