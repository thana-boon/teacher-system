import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/logo — serve the uploaded school logo as an image (used as favicon).
// Falls back to the static favicon when no logo is set. Public.
export async function GET(request: Request) {
  const settings = await getSettings();
  const data = settings.logoBase64;
  const match = data?.match(/^data:(image\/[a-zA-Z.+-]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.redirect(new URL("/favicon.ico", request.url));
  }
  const [, mime, b64] = match;
  const bytes = Buffer.from(b64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
