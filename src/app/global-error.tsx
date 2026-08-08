"use client";

import { useEffect } from "react";
import { logError } from "@/lib/logger";

// Last-resort boundary: only fires if the root layout itself throws, which
// is why it must render its own <html>/<body> — Next.js docs, App Router
// error handling — and why it can't rely on globals.css/Tailwind classes
// being loaded (this replaces the document that would have linked them).
// Dark mode here is a plain <style> tag with a prefers-color-scheme query
// instead of Tailwind classes, kept deliberately small since this page
// can't assume any app CSS has loaded.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("client-error-boundary", error, { digest: error.digest, boundary: "global" });
  }, [error]);

  return (
    <html lang="en">
      <body className="ge-body">
        <style>{`
          .ge-body {
            display: flex;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            font-family: system-ui, sans-serif;
            background: #f4f4f5;
            color: #18181b;
            margin: 0;
          }
          .ge-card {
            max-width: 380px;
            width: 100%;
            text-align: center;
            padding: 24px;
            border-radius: 12px;
            border: 1px solid #e4e4e7;
            background: #fff;
          }
          .ge-desc { color: #71717a; }
          .ge-btn {
            font-size: 14px;
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 8px;
            border: none;
            background: #18181b;
            color: #fff;
            cursor: pointer;
          }
          @media (prefers-color-scheme: dark) {
            .ge-body { background: #09090b; color: #fafafa; }
            .ge-card { background: #18181b; border-color: #27272a; }
            .ge-desc { color: #a1a1aa; }
            .ge-btn { background: #fafafa; color: #18181b; }
          }
        `}</style>
        <div className="ge-card">
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
          <p className="ge-desc" style={{ fontSize: 14, margin: "0 0 16px" }}>
            The application hit an unexpected error. Please try again.
          </p>
          <button className="ge-btn" onClick={() => reset()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
