import type { RoiPeriod } from "app/utils/roi";

type AdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, string> },
  ) => Promise<Response>;
};

type ShopifyqlResult = {
  parseErrors?: string[];
  tableData?: { rows?: unknown[] };
};

type AnalyticsResponse = {
  data?: {
    sales?: ShopifyqlResult;
    customers?: ShopifyqlResult;
    sessions?: ShopifyqlResult;
  };
  errors?: Array<{ message?: string }>;
};

export type ShopifyRoiMetrics = {
  grossSales: number;
  orders: number;
  newCustomers: number;
  totalSessions: number;
};

const SHOPIFYQL_METRICS_QUERY = `#graphql
  query RoiPeriodMetrics($salesQuery: String!, $customersQuery: String!, $sessionsQuery: String!) {
    sales: shopifyqlQuery(query: $salesQuery) {
      tableData { rows }
      parseErrors
    }
    customers: shopifyqlQuery(query: $customersQuery) {
      tableData { rows }
      parseErrors
    }
    sessions: shopifyqlQuery(query: $sessionsQuery) {
      tableData { rows }
      parseErrors
    }
  }
`;

function readMetric(result: ShopifyqlResult | undefined, field: string) {
  if (!result) throw new Error(`Shopify did not return the ${field} report.`);
  if (result.parseErrors?.length) {
    throw new Error(`Shopify analytics query failed: ${result.parseErrors.join("; ")}`);
  }

  const row = result.tableData?.rows?.[0];
  if (row === undefined) return 0;
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`Shopify returned an invalid ${field} report.`);
  }

  const value = Number(Reflect.get(row, field));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Shopify returned an invalid ${field} value.`);
  }
  return value;
}

export async function getShopifyRoiMetrics(
  admin: AdminClient,
  periodDays: RoiPeriod,
): Promise<ShopifyRoiMetrics> {
  const dateRange = `SINCE startOfDay(-${periodDays}d) UNTIL today`;
  const variables = {
    salesQuery: `FROM sales SHOW gross_sales, orders ${dateRange}`,
    customersQuery: `FROM customers SHOW new_customer_records ${dateRange}`,
    sessionsQuery: `FROM sessions SHOW sessions ${dateRange}`,
  };

  const response = await admin.graphql(SHOPIFYQL_METRICS_QUERY, { variables });
  if (!response.ok) {
    throw new Error(`Shopify analytics request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as AnalyticsResponse;
  if (payload.errors?.length) {
    throw new Error(
      `Shopify analytics request failed: ${payload.errors.map((error) => error.message ?? "Unknown GraphQL error").join("; ")}`,
    );
  }
  if (!payload.data) throw new Error("Shopify did not return analytics data.");

  return {
    grossSales: readMetric(payload.data.sales, "gross_sales"),
    orders: readMetric(payload.data.sales, "orders"),
    newCustomers: readMetric(payload.data.customers, "new_customer_records"),
    totalSessions: readMetric(payload.data.sessions, "sessions"),
  };
}
