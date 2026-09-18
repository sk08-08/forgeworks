// Safe for browser and server; the server always rechecks stored file bytes.
export const MEDIA_MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function hasMediaSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") return bytes.length >= 8 &&
    [137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value);
  if (mime === "image/jpeg") return bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/webp") return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0,4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  // AVIF can advertise its brand in the compatible-brands sequence.
  if (mime === "image/avif") return bytes.length >= 16 &&
    String.fromCharCode(...bytes.slice(4,8)) === "ftyp" &&
    ["avif", "avis"].some(brand =>
      String.fromCharCode(...bytes.slice(8, Math.min(bytes.length, 64))).includes(brand));
  return false;
}
