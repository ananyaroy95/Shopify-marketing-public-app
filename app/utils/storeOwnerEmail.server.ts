// Resolves the Store Owner's email for the ROI (#3) and summary (#4) emails.
// This intentionally uses the same protected shop.email field as the owner
// profile query. Shopify must enable the requested protected data fields first.
type MinimalAdmin = { graphql: (query: string, options?: any) => Promise<Response> };

export async function getStoreOwnerEmail(admin: MinimalAdmin, context: string) {
  try {
    const response = await admin.graphql(`query { shop { email } }`);
    const json: any = await response.json();

    if (json.errors) {
      throw new Error(`GraphQL query failed: ${JSON.stringify(json.errors)}`);
    }

    const email = json.data?.shop?.email;
    if (email) return email as string;
  } catch (error) {
    console.error(`${context}: failed to load store owner email (non-fatal):`, error);
  }

  const fallback = process.env.TEST_STORE_OWNER_EMAIL;
  if (fallback) {
    console.warn(
      `${context}: using TEST_STORE_OWNER_EMAIL fallback ('${fallback}') because the live protected shop.email lookup ` +
        `didn't return a value. This is a testing stand-in — see storeOwnerEmail.server.ts.`,
    );
    return fallback;
  }

  return "";
}
