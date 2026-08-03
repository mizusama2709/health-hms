// Isomorphic (client + server) file-type sniffing for imaging uploads — kept
// here, separate from src/lib/imaging.ts, so the client-side pre-submit
// validation and the server-side upload path share one definition instead
// of two that could silently drift apart.

export const SUPPORTED_IMAGING_CONTENT_TYPES = ["application/dicom", "image/jpeg", "image/png", "application/pdf"] as const;

function asciiAt(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

// DICOM's "DICM" magic sits at byte 128 in a standard Part-10 file, but some
// files omit that 128-byte preamble entirely — those fall through to the
// "application/dicom" default below, which is a guess pending a real parse
// (dicom-parser, run separately), not a guarantee.
export function detectContentType(bytes: Uint8Array): string {
  if (bytes.length >= 132 && asciiAt(bytes, 128, 132) === "DICM") return "application/dicom";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 4 && asciiAt(bytes, 0, 4) === "%PDF") return "application/pdf";
  return "application/dicom";
}
