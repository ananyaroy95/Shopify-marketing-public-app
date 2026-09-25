type AdminClient = {
  graphql: (query: string, options?: { variables?: Record<string, string> }) => Promise<Response>;
};

type AccessScopeNode = { handle: string };

/**
 * Temporary Admin API diagnostics.
 * Logs Shopify-granted scopes (not the app's internal checklist permissions)
 * and probes shop-owner / customer-count / order-count queries one at a time
 * so a 403 can be tied to a specific call.
 */
export async function logAdminAccessDiagnostics(
  admin: AdminClient,
  extras?: {
    shop?: string;
    sessionScope?: string | null;
    hasRefreshToken?: boolean;
    expires?: Date | string | number | null;
  },
) {
  console.log("[access-diag] shop:", extras?.shop ?? "(unknown)");
  console.log(
    "[access-diag] session.scope (from install token):",
    extras?.sessionScope || "(empty — not stored on this session)",
  );
  console.log(
    "[access-diag] session has refreshToken:",
    extras?.hasRefreshToken ? "yes (expiring token)" : "no (likely non-expiring / rejected)",
  );
  console.log("[access-diag] session.expires:", extras?.expires ?? "(none)");
  console.log(
    "[access-diag] declared SCOPES env:",
    process.env.SCOPES || "(empty)",
  );

  const scopes = await probe(
    admin,
    "currentAppInstallation.accessScopes",
    `#graphql
      query AccessDiagScopes {
        currentAppInstallation {
          accessScopes { handle }
        }
      }
    `,
  );

  if (scopes?.ok && scopes.data) {
    const handles =
      (scopes.data as { currentAppInstallation?: { accessScopes?: AccessScopeNode[] } })
        .currentAppInstallation?.accessScopes?.map((scope) => scope.handle) ?? [];
    console.log("[access-diag] Shopify-granted scopes:", handles.join(", ") || "(none)");
  }

  await probe(
    admin,
    "shop-owner (shop { name email ... })",
    `#graphql
      query AccessDiagShopOwner {
        shop {
          name
          shopOwnerName
          email
        }
      }
    `,
  );

  await probe(
    admin,
    "customersCount",
    `#graphql
      query AccessDiagCustomersCount {
        customersCount { count }
      }
    `,
  );

  await probe(
    admin,
    "ordersCount",
    `#graphql
      query AccessDiagOrdersCount {
        ordersCount { count }
      }
    `,
  );
}

async function probe(admin: AdminClient, label: string, query: string) {
  try {
    const response = await admin.graphql(query);
    const json = (await response.json()) as {
      data?: unknown;
      errors?: Array<{ message?: string }>;
    };

    if (json.errors?.length) {
      console.error(
        `[access-diag] ${label}: GraphQL errors`,
        JSON.stringify(json.errors),
      );
      return { ok: false as const, data: json.data };
    }

    console.log(`[access-diag] ${label}: OK`, JSON.stringify(json.data));
    return { ok: true as const, data: json.data };
  } catch (error) {
    if (error instanceof Response) {
      const body = await error.clone().text().catch(() => "");
      console.error(`[access-diag] ${label}: HTTP ${error.status} ${body}`);
    } else {
      console.error(`[access-diag] ${label}:`, error);
    }
    return { ok: false as const, data: undefined };
  }
}
