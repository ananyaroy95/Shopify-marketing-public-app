import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions, markGreetingShown } from "app/utils/dbPermissionStorage.server";
import GreetingPage from "app/Component/greeting";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const existing = await getPermissions(shop);

  // Only reachable right after submitting the checklist, and only once —
  // anything else (not yet submitted, or already seen) belongs on /app.
  if (!existing?.termsAccepted || existing.greetingShown) {
    return redirect("/app");
  }

  await markGreetingShown(shop);

  return null;
}

export default function Greeting() {
  return <GreetingPage />;
}
