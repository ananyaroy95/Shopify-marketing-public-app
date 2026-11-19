type AdminClient = {
  graphql: (query: string, options?: { variables?: Record<string, string> }) => Promise<Response>;
};

type CountResult = {
  count: number;
  precision: "AT_LEAST" | "EXACT";
};

export type CountDashboard = {
  available: boolean;
  total: number;
  precision: CountResult["precision"];
};

export type DashboardData = {
  customers: CountDashboard;
  orders: CountDashboard;
};

const CUSTOMERS_QUERY = `#graphql
  query DashboardCustomerCount($today: String!) {
    customersCount(query: $today, limit: null) {
      count
      precision
    }
  }
`;

const ORDERS_QUERY = `#graphql
  query DashboardOrderCount($today: String!) {
    ordersCount(query: $today, limit: null) {
      count
      precision
    }
  }
`;

const unavailable: CountDashboard = {
  available: false,
  total: 0,
  precision: "EXACT",
};

function todayQuery() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return `created_at:>=${today.toISOString().slice(0, 10)}`;
}

async function runQuery<T>(admin: AdminClient, query: string, variables: Record<string, string>) {
  try {
    const response = await admin.graphql(query, { variables });
    const json = (await response.json()) as { data?: T; errors?: unknown[] };
    if (json.errors?.length || !json.data) {
      console.error("Dashboard GraphQL error:", JSON.stringify(json.errors ?? "No data"));
      return null;
    }
    return json.data;
  } catch (error) {
    if (error instanceof Response) {
      const body = await error.clone().text().catch(() => "");
      console.error(`Dashboard GraphQL request failed: HTTP ${error.status} ${body}`);
    } else {
      console.error("Dashboard GraphQL request failed:", error);
    }
    return null;
  }
}

function mapCount(count: CountResult): CountDashboard {
  return {
    available: true,
    total: Number(count.count) || 0,
    precision: count.precision,
  };
}

export async function loadDashboard(admin: AdminClient): Promise<DashboardData> {
  const variables = { today: todayQuery() };

  // Run sequentially so logs show which query fails (customers vs orders).
  console.log("[access-diag] dashboard customersCount query starting");
  const customers = await runQuery<{ customersCount: CountResult }>(admin, CUSTOMERS_QUERY, variables);
  console.log(
    "[access-diag] dashboard customersCount:",
    customers ? "OK" : "FAILED",
  );

  console.log("[access-diag] dashboard ordersCount query starting");
  const orders = await runQuery<{ ordersCount: CountResult }>(admin, ORDERS_QUERY, variables);
  console.log(
    "[access-diag] dashboard ordersCount:",
    orders ? "OK" : "FAILED",
  );

  return {
    customers: customers ? mapCount(customers.customersCount) : unavailable,
    orders: orders ? mapCount(orders.ordersCount) : unavailable,
  };
}
