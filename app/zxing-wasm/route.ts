import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WASM_FILENAME = "zxing_reader.v5.wasm";
const WASM_PATH = path.join(process.cwd(), "public", WASM_FILENAME);

export async function GET() {
  try {
    const stat = await fs.promises.stat(WASM_PATH);
    const stream = fs.createReadStream(WASM_PATH);
    return new NextResponse(stream as fs.ReadStream, {
      status: 200,
      headers: {
        "Content-Type": "application/wasm",
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable, no-transform",
        "Content-Encoding": "identity",
        "Content-Disposition": `inline; filename="${WASM_FILENAME}"`,
        "Accept-Ranges": "bytes",
        Vary: "Accept-Encoding",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WASM not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
