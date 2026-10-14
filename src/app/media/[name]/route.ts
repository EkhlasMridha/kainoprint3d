import { mimeForExt, readStored } from "@/server/storage";

/** Public product images uploaded through the admin panel (PNG/JPEG/WEBP only, validated on upload). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = await readStored("media", name);
  if (!file || !["png", "jpg", "jpeg", "webp"].includes(file.ext)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": mimeForExt(file.ext),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
