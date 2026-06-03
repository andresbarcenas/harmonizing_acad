import { NextResponse } from "next/server";

import { isWompiEnabled } from "@/lib/wompi/config";
import { processWompiWebhook } from "@/lib/wompi/service";
import { type WompiWebhookPayload } from "@/lib/wompi/webhook";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isWompiEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let payload: WompiWebhookPayload;
  try {
    payload = JSON.parse(await req.text()) as WompiWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await processWompiWebhook({
      payload,
      checksumHeader: req.headers.get("x-event-checksum"),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process Wompi webhook";
    return NextResponse.json({ error: message }, { status: message === "INVALID_WOMPI_CHECKSUM" ? 401 : 400 });
  }
}
