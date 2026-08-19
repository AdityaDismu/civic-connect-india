import { supabase } from "@/integrations/supabase/client";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Please upload a JPG, PNG or WEBP image.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Image is larger than 8MB. Please choose a smaller photo.";
  }
  return null;
}

/** Downscale in the browser so uploads and AI calls stay fast. */
export async function compressImage(file: File, maxSize = 1280): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(blob);
  });
}

export async function uploadImage(
  bucket: "complaint-images" | "resolution-evidence" | "voice-notes",
  userId: string,
  blob: Blob,
): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${bucket === "voice-notes" ? "webm" : "jpg"}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      contentType: bucket === "voice-notes" ? "audio/webm" : "image/jpeg",
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return `${bucket}/${path}`;
}

const signedCache = new Map<string, string>();

/** Stored value is `bucket/path`; buckets are private so we sign on read. */
export async function resolveImageUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (stored.startsWith("http")) return stored;
  const cached = signedCache.get(stored);
  if (cached) return cached;
  const slash = stored.indexOf("/");
  if (slash < 0) return null;
  const bucket = stored.slice(0, slash);
  const path = stored.slice(slash + 1);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24);
  if (error || !data?.signedUrl) return null;
  signedCache.set(stored, data.signedUrl);
  return data.signedUrl;
}
