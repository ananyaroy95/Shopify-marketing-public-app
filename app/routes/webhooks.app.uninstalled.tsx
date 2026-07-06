import crypto from "crypto";

export async function action({ request }: { request: Request }) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!hmacHeader) {
    return new Response("Missing HMAC", { status: 401 });
  }

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const generatedHmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const valid = crypto.timingSafeEqual(
    Buffer.from(generatedHmac),
    Buffer.from(hmacHeader),
  );

  if (!valid) {
    return new Response("Invalid HMAC", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const shop = payload.myshopify_domain;

  if (!shop) {
    return new Response("No shop domain", { status: 400 });
  }

  // Keep the shop/session/permission data even after uninstall.
  // Remove cleanup logic if you want to preserve data for later analytics or reinstallation.

  return new Response("OK", { status: 200 });
}
