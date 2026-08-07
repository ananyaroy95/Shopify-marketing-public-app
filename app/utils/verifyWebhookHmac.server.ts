import crypto from "crypto";

type VerifyResult =
  | { ok: true; rawBody: string }
  | { ok: false; response: Response };

export async function verifyWebhookHmac(request: Request): Promise<VerifyResult> {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!hmacHeader) {
    return { ok: false, response: new Response("Missing HMAC", { status: 401 }) };
  }

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return { ok: false, response: new Response("Server misconfigured", { status: 500 }) };
  }

  const generatedHmac = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const generatedBuffer = Buffer.from(generatedHmac);
  const headerBuffer = Buffer.from(hmacHeader);

  const valid =
    generatedBuffer.length === headerBuffer.length &&
    crypto.timingSafeEqual(generatedBuffer, headerBuffer);

  if (!valid) {
    return { ok: false, response: new Response("Invalid HMAC", { status: 401 }) };
  }

  return { ok: true, rawBody };
}
