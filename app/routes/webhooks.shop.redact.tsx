import { verifyWebhookHmac } from "app/utils/verifyWebhookHmac.server";
import { uninstallShop } from "app/utils/dbShopStorage.server";
import { findSessionIdsByShop, deleteSessions } from "app/utils/dbSessionStorage.server";

export async function action({ request }: { request: Request }) {
  const result = await verifyWebhookHmac(request);
  if (!result.ok) return result.response;

  const payload = JSON.parse(result.rawBody);
  const shop = payload.shop_domain;

  if (!shop) {
    return new Response("No shop domain", { status: 400 });
  }

  const sessionIds = await findSessionIdsByShop(shop);
  if (sessionIds.length > 0) {
    await deleteSessions(sessionIds);
  }

  // Cascades to the shop's permission record via the Prisma schema's onDelete: Cascade.
  await uninstallShop(shop);

  return new Response("OK", { status: 200 });
}
