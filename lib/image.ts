// Client-only: downscale + compress an image File into a small data URL.
// Keeps uploads well under serverless body limits (Vercel ~4.5MB) and the DB tidy.

export async function fileToDataUrl(
  file: File,
  {
    maxSize = 512,
    quality = 0.85,
    mime = "image/jpeg",
  }: { maxSize?: number; quality?: number; mime?: string } = {},
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("โหลดรูปไม่ได้"));
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // fallback: original
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(mime, quality);
}
