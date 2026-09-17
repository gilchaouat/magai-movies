import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const dynamic = "force-static";

const SIZE = { width: 192, height: 192 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17140f",
          color: "#e50914",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        M
      </div>
    ),
    { ...SIZE }
  );
}
