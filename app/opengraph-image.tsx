import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0a0b0d";
const FG = "#e9e9ec";
const DIM = "#bfbfbf";
const ACCENT = "#86dc57";
const LINE = "rgba(233, 233, 236, 0.14)";
const SURFACE = "#15161a";

type Font = { name: string; data: Buffer; weight: 400 | 700 };

// satori accepts TTF/WOFF but NOT woff2 - use the .woff files from fontsource.
async function loadFonts(): Promise<Font[]> {
  const fonts: Font[] = [];
  for (const weight of [400, 700] as const) {
    try {
      fonts.push({
        name: "Montserrat",
        data: await readFile(
          join(
            process.cwd(),
            `node_modules/@fontsource/montserrat/files/montserrat-latin-${weight}-normal.woff`,
          ),
        ),
        weight,
      });
    } catch {
      // fall through - ImageResponse ships a default font
    }
  }
  return fonts;
}

export default async function Image() {
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: BG,
          color: FG,
          fontFamily: "Montserrat",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: SURFACE,
                border: `1px solid ${LINE}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: ACCENT,
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              S
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>
              Nexa
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              borderRadius: 999,
              border: `1px solid ${LINE}`,
              backgroundColor: SURFACE,
              color: DIM,
              fontSize: 20,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: ACCENT,
              }}
            />
            On-chain 24/7
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            <div>Your tokenized stocks,</div>
            <div>put to work.</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 28,
              color: DIM,
            }}
          >
            Trade, earn, and borrow against bStocks without ever selling.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {["Trade", "Earn", "Borrow"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "12px 26px",
                  borderRadius: 12,
                  border: `1px solid ${LINE}`,
                  backgroundColor: SURFACE,
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: DIM }}>
            Self-custodial · BNB Smart Chain
          </div>
        </div>
      </div>
    ),
    fonts.length > 0 ? { fonts } : undefined,
  );
}
