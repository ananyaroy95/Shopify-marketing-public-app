import { verifyWebhookHmac } from "app/utils/verifyWebhookHmac.server";

export async function action({ request }: { request: Request }) {
  const result = await verifyWebhookHmac(request);
  if (!result.ok) return result.response;

  // Adbuffs Onboard doesn't store or process customer data, so there's
  // nothing to redact.
  return new Response(null, { status: 200 });
}
