import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation, useRouteError, isRouteErrorResponse } from "react-router";
import { NavMenu } from "@shopify/app-bridge-react";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getPermissions } from "../utils/dbPermissionStorage.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const existing = await getPermissions(session.shop);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    greetingShown: existing?.greetingShown === true,
  };
}

export default function App() {
  const { apiKey, greetingShown } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();

  // Menus unlock once the merchant reaches the congratulation screen. The
  // greeting loader flips greetingShown in parallel with this loader, so the
  // pathname check covers that first visit.
  const showNav = greetingShown || pathname === "/app/greeting";

  return (
    <AppProvider embedded apiKey={apiKey}>
      {showNav && (
        <NavMenu>
          <a href="/app/feedback">Feedback</a>
          <a href="/app/roi-calculator">ROI Calculation</a>
        </NavMenu>
      )}
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  // boundary.error() only handles the case where thrown Response bodies are
  // HTML strings (Shopify's own auth/billing redirects). Anything else — e.g. a
  // plain 403 JSON error from a data call — has an object `data`, which its
  // dangerouslySetInnerHTML would render as the literal text "[object Object]".
  // Guard for that case ourselves before delegating.
  if (isRouteErrorResponse(error) && typeof error.data !== "string") {
    console.error("Route error (non-string body):", error.status, error.data);
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h2>Something went wrong (HTTP {error.status})</h2>
        <p>Please refresh the page. If this keeps happening, contact support.</p>
      </div>
    );
  }

  return boundary.error(error);
}
