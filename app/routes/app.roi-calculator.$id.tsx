import { Outlet } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const permissions = await getPermissions(session.shop);
  if (permissions?.termsAccepted !== true) throw new Response(null, { status: 302, headers: { Location: "/app" } });
  return null;
}

export default function RoiRecordLayout() {
  return <Outlet />;
}
