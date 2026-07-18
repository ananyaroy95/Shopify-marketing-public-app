import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError, isRouteErrorResponse } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
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
