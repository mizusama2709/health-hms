"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { detectContentType } from "@/lib/imagingFormat";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// The accept="" attribute on <input type="file"> is only a picker hint, not
// enforcement — a user can still choose anything. This runs the exact same
// check the server does (magic-byte sniff, then a real dicom-parser parse
// for anything not JPEG/PNG/PDF) so an obviously-wrong file is rejected
// instantly instead of only after a full upload round trip.
async function validateFile(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectContentType(bytes);
  if (contentType !== "application/dicom") return null;

  try {
    const dicomParser = await import("dicom-parser");
    dicomParser.parseDicom(bytes);
    return null;
  } catch {
    return `"${file.name}" doesn't look like a DICOM, JPG, PNG, or PDF file`;
  }
}

/**
 * Server actions don't expose upload progress (no XHR/fetch progress hooks
 * on the wire they use), so a real multi-slice series upload — now allowed
 * up to 100MB — would show nothing but a spinner for however long it takes.
 * This posts to a Route Handler via XMLHttpRequest instead, purely so
 * xhr.upload.onprogress can drive a real percentage bar.
 */
export function ImagingUploadForm({ imagingOrderId }: { imagingOrderId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [validating, setValidating] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const files = inputRef.current?.files;
    if (!files || files.length === 0) {
      toast.error("Choose at least one file to upload");
      return;
    }

    setValidating(true);
    for (const file of Array.from(files)) {
      const error = await validateFile(file);
      if (error) {
        setValidating(false);
        toast.error(error);
        return;
      }
    }
    setValidating(false);

    const formData = new FormData();
    let total = 0;
    for (const file of Array.from(files)) {
      formData.append("files", file);
      total += file.size;
    }
    setFileCount(files.length);
    setTotalBytes(total);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/imaging/orders/${imagingOrderId}/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      setProgress(null);
      let body: { success?: boolean; error?: string; fileCount?: number } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // fall through to the generic error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.success) {
        toast.success(`Uploaded ${body.fileCount ?? files.length} file(s)`);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } else {
        toast.error(body.error ?? "Upload failed");
      }
    };

    xhr.onerror = () => {
      setProgress(null);
      toast.error("Upload failed — check your connection");
    };

    xhr.send(formData);
  }

  const uploading = progress !== null;
  const busy = uploading || validating;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".dcm,image/jpeg,image/png,application/pdf"
          className="text-xs"
          disabled={busy}
        />
        <Button type="submit" size="sm" variant="outline" disabled={busy}>
          {validating ? "Checking…" : uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
      {uploading && (
        <div className="flex flex-col gap-1">
          <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">
            {progress}% — {fileCount} file{fileCount === 1 ? "" : "s"}, {formatBytes(totalBytes)}
          </span>
        </div>
      )}
    </form>
  );
}
