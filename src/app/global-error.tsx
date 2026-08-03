"use client";

// Last-resort boundary: only fires if the root layout itself throws, which
// is why it must render its own <html>/<body> — Next.js docs, App Router
// error handling — and why it can't rely on globals.css/Tailwind classes
// being loaded (this replaces the document that would have linked them).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f4f4f5",
          color: "#18181b",
          margin: 0,
        }}
      >
        <div
          style={{
            maxWidth: 380,
            width: "100%",
            textAlign: "center",
            padding: 24,
            borderRadius: 12,
            border: "1px solid #e4e4e7",
            background: "#fff",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#71717a", margin: "0 0 16px" }}>
            The application hit an unexpected error. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              fontSize: 14,
              fontWeight: 500,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#18181b",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
