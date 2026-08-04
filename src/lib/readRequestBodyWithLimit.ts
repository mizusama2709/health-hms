export class PayloadTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Request body exceeds the ${(maxBytes / (1024 * 1024)).toFixed(0)}MB limit`);
    this.name = "PayloadTooLargeError";
  }
}

// Next.js's `bodySizeLimit` config only applies to Server Actions, not Route
// Handlers — calling req.formData() directly on a Route Handler buffers the
// entire body into memory with no cap, regardless of what Content-Length
// claims (which a non-browser client can lie about or omit via chunked
// transfer encoding). This enforces the limit while streaming, so memory
// use is bounded by maxBytes even against a dishonest client, not just a
// well-behaved browser upload.
export async function readRequestBodyWithLimit(req: Request, maxBytes: number): Promise<Buffer> {
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError(maxBytes);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}
