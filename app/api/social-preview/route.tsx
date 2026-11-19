import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREVIEW_SIZE = { width: 1200, height: 630 } as const;
const FONT_PATH = join(process.cwd(), "assets/shop-print/fonts/Estedad-Medium.ttf");
const PUBLIC_ROOT = resolve(process.cwd(), "public");

function safePhotoPath(value: string | null): string | null {
  if (!value || value.includes("..") || value.includes("%") || value.includes("\\")) return null;
  const inPublicArea = /^\/(?:shop-preview|wiki|halleus-visuals)\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g)$/.test(value);
  const approvedRootImage = /^\/halleus-(?:chart-wheel-sample-polished-centered|compare-og|privacy-hero|order-hero)\.(?:webp|png)$/.test(value);
  if (!inPublicArea && !approvedRootImage) return null;
  const path = resolve(PUBLIC_ROOT, value.slice(1));
  return path.startsWith(PUBLIC_ROOT + sep) ? path : null;
}

function shortText(value: string | null, fallback: string, limit: number): string {
  const cleaned = (value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, limit) : fallback;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = shortText(params.get("title"), "هالیوس؛ هر لحظه یک آسمان", 106);
  const section = shortText(params.get("section"), "هالیوس", 52);
  const page = shortText(params.get("page"), "/", 170);
  const fontFile = await readFile(FONT_PATH);
  const fontData = fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength) as ArrayBuffer;

  const path = safePhotoPath(params.get("photo"));
  let photo: string | null = null;
  if (path) {
    try {
      const bytes = await readFile(path);
      if (bytes.length <= 3_000_000) {
        const png = await sharp(bytes).resize(468, 478, { fit: "cover" }).png().toBuffer();
        photo = "data:image/png;base64," + png.toString("base64");
      }
    } catch {
      // The title-led card remains usable when an optional local photo is absent.
    }
  }

  const hash = Array.from(title + page).reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 19);
  const stars = Array.from({ length: 16 }, (_, i) => ({
    x: 2 + ((hash + i * 73) % 96),
    y: 7 + ((hash * (i + 3) + i * 37) % 86),
    radius: i % 4 === 0 ? 5 : 3,
  }));
  const fontSize = title.length > 78 ? 34 : title.length > 57 ? 40 : title.length > 38 ? 47 : 58;
  const hasPhoto = photo !== null;

  return new ImageResponse(
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      width: "100%", height: "100%", padding: "55px 62px",
      backgroundColor: "#08090b", color: "#f7fafc", direction: "rtl",
      fontFamily: "Estedad", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start",
        width: hasPhoto ? 560 : 890, height: 510, justifyContent: "center",
        position: "relative", zIndex: 2,
      }}>
        <div style={{
          display: "flex", color: "#b8c8d9", fontSize: 23,
          marginBottom: 32, paddingBottom: 12,
          borderBottom: "1px solid #506073",
        }}>{section}</div>
        <div style={{
          display: "flex", fontSize, fontWeight: 400,
          lineHeight: 1.6, textAlign: "right", maxWidth: "100%",
        }}>{title}</div>
        <div style={{
          display: "flex", color: "#a5b1bf", marginTop: 42,
          fontSize: 20, letterSpacing: 3,
        }}>HALLEUS.IR</div>
      </div>
      {photo ? (
        <div style={{
          display: "flex", width: 475, height: 485,
          borderRadius: 20, overflow: "hidden",
          border: "1px solid #444b57",
        }}>
          <img src={photo} alt="" width={475} height={485}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : (
        <div style={{
          display: "flex", position: "absolute", top: 20, left: 0,
          width: 520, height: 590, borderRadius: 300,
          border: "1px solid #303742", opacity: 0.8,
        }}>
          <div style={{
            display: "flex", position: "absolute",
            top: 65, left: 65, right: 65, bottom: 65,
            borderRadius: 280, border: "1px solid #374350",
          }} />
          {stars.map((star, i) => (
            <div key={i} style={{
              position: "absolute", left: star.x + "%", top: star.y + "%",
              width: star.radius, height: star.radius, borderRadius: 100,
              backgroundColor: i % 3 === 0 ? "#dbe7f4" : "#788b9e",
              opacity: i % 4 === 0 ? 0.95 : 0.48,
            }} />
          ))}
        </div>
      )}
    </div>,
    {
      ...PREVIEW_SIZE,
      fonts: [{ name: "Estedad", data: fontData, style: "normal", weight: 400 }],
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    },
  );
}
