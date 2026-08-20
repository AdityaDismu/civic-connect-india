import { resolveImageUrl } from "@/lib/storage";

export type ImageMetadata = {
  available: boolean;
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
};

/** Reads the small subset of JPEG EXIF needed for location consistency checks. */
export async function readImageMetadata(file: File): Promise<ImageMetadata> {
  if (file.type !== "image/jpeg") return { available: false };
  try {
    const view = new DataView(await file.arrayBuffer());
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      if (view.getUint16(offset) !== 0xffe1) {
        offset += 2 + view.getUint16(offset + 2);
        continue;
      }
      const exif = offset + 4;
      if (new TextDecoder().decode(new Uint8Array(view.buffer, exif, 4)) !== "Exif") break;
      const tiff = exif + 6;
      const little = view.getUint16(tiff) === 0x4949;
      const u16 = (at: number) => view.getUint16(at, little);
      const u32 = (at: number) => view.getUint32(at, little);
      const firstIfd = tiff + u32(tiff + 4);
      const entry = (base: number, tag: number) => {
        const count = u16(base);
        for (let i = 0; i < count; i += 1) {
          const at = base + 2 + i * 12;
          if (u16(at) === tag) return at;
        }
        return null;
      };
      const gpsPointer = entry(firstIfd, 0x8825);
      const dateEntry = entry(firstIfd, 0x0132);
      const capturedAt = dateEntry
        ? readAscii(view, tiff + u32(dateEntry + 8), u32(dateEntry + 4))
        : undefined;
      if (!gpsPointer) return { available: Boolean(capturedAt), capturedAt };
      const gpsIfd = tiff + u32(gpsPointer + 8);
      const latRef = entry(gpsIfd, 1);
      const lat = entry(gpsIfd, 2);
      const lngRef = entry(gpsIfd, 3);
      const lng = entry(gpsIfd, 4);
      if (!lat || !lng || !latRef || !lngRef) return { available: Boolean(capturedAt), capturedAt };
      const rational = (pointer: number) => {
        const at = tiff + u32(pointer + 8);
        return [0, 1, 2].reduce(
          (total, index) =>
            total +
            view.getUint32(at + index * 8, little) /
              view.getUint32(at + index * 8 + 4, little) /
              (index === 0 ? 1 : index === 1 ? 60 : 3600),
          0,
        );
      };
      const latitude =
        rational(lat) * (String.fromCharCode(view.getUint8(latRef + 8)) === "S" ? -1 : 1);
      const longitude =
        rational(lng) * (String.fromCharCode(view.getUint8(lngRef + 8)) === "W" ? -1 : 1);
      return { available: true, capturedAt, latitude, longitude };
    }
  } catch {
    // Metadata is optional and should never interrupt a complaint submission.
  }
  return { available: false };
}

function readAscii(view: DataView, offset: number, count: number) {
  return new TextDecoder()
    .decode(new Uint8Array(view.buffer, offset, count))
    .replace(/\0/g, "")
    .trim();
}

async function perceptualHash(source: string): Promise<string | null> {
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, 9, 8);
    const pixels = context.getImageData(0, 0, 9, 8).data;
    let hash = "";
    for (let y = 0; y < 8; y += 1)
      for (let x = 0; x < 8; x += 1) {
        const at = (y * 9 + x) * 4;
        const next = at + 4;
        const brightness = pixels[at] + pixels[at + 1] + pixels[at + 2];
        const nextBrightness = pixels[next] + pixels[next + 1] + pixels[next + 2];
        hash += brightness > nextBrightness ? "1" : "0";
      }
    return hash;
  } catch {
    return null;
  }
}

export async function findSimilarImage(
  sourceDataUrl: string,
  candidates: Array<{ complaintId: string; imageUrl: string }>,
): Promise<{ similarity: number; matchedComplaintId?: string }> {
  const sourceHash = await perceptualHash(sourceDataUrl);
  if (!sourceHash) return { similarity: 0 };
  let best = { similarity: 0, matchedComplaintId: undefined as string | undefined };
  for (const candidate of candidates.slice(0, 40)) {
    const url = await resolveImageUrl(candidate.imageUrl);
    if (!url) continue;
    const hash = await perceptualHash(url);
    if (!hash) continue;
    const similarity = Math.round(
      ((64 - [...hash].filter((bit, index) => bit !== sourceHash[index]).length) / 64) * 100,
    );
    if (similarity > best.similarity)
      best = { similarity, matchedComplaintId: candidate.complaintId };
  }
  return best;
}
