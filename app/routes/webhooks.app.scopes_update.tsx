import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.webhook(request);
  return new Response(null, { status: 200 });
};
