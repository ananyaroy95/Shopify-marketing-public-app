import crypto from "crypto";
import { deletePermissions } from "app/utils/dbPermissionStorage.server";
import { markShopUninstalled } from "app/utils/dbShopStorage.server";

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

  // Reset onboarding on uninstall so a reinstall goes through the full
  // checklist → greeting flow again, rather than jumping straight to the
  // "already set up" view from a prior install.
  await deletePermissions(shop);
  await markShopUninstalled(shop);

  return new Response("OK", { status: 200 });
}
