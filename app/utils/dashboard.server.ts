type AdminClient = {
  graphql: (query: string, options?: { variables?: Record<string, string> }) => Promise<Response>;
};

const PERIODS = [
  { id: "year", label: "Last 1 Year", months: 12 },
  { id: "sixMonths", label: "Last 6 Months", months: 6 },
  { id: "threeMonths", label: "Last 3 Months", months: 3 },
  { id: "month", label: "Last 1 Month", months: 1 },
  { id: "today", label: "Today", months: 0 },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

type CountResult = Record<PeriodId, { count: number }>;

export type CountPoint = {
  label: string;
  count: number;
};

export type CountDashboard = {
  available: boolean;
  points: CountPoint[];
};

export type DashboardData = {
  customers: CountDashboard;
  orders: CountDashboard;
};

const CUSTOMERS_QUERY = `#graphql
  query DashboardCustomerCounts($year: String!, $sixMonths: String!, $threeMonths: String!, $month: String!, $today: String!) {
    year: customersCount(query: $year) { count }
    sixMonths: customersCount(query: $sixMonths) { count }
    threeMonths: customersCount(query: $threeMonths) { count }
    month: customersCount(query: $month) { count }
    today: customersCount(query: $today) { count }
  }
`;

const ORDERS_QUERY = `#graphql
  query DashboardOrderCounts($year: String!, $sixMonths: String!, $threeMonths: String!, $month: String!, $today: String!) {
    year: ordersCount(query: $year) { count }
    sixMonths: ordersCount(query: $sixMonths) { count }
    threeMonths: ordersCount(query: $threeMonths) { count }
    month: ordersCount(query: $month) { count }
    today: ordersCount(query: $today) { count }
  }
`;

const unavailable: CountDashboard = {
  available: false,
  points: PERIODS.map((period) => ({ label: period.label, count: 0 })),
};

function utcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthsBefore(from: Date, months: number) {
  const result = new Date(from);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function periodQueries() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Object.fromEntries(
    PERIODS.map((period) => [period.id, `created_at:>=${utcDate(monthsBefore(today, period.months))}`]),
  ) as Record<PeriodId, string>;
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

function mapCounts(data: CountResult): CountDashboard {
  return {
    available: true,
    points: PERIODS.map((period) => ({
      label: period.label,
      count: Number(data[period.id]?.count ?? 0) || 0,
    })),
  };
}

export async function loadDashboard(admin: AdminClient): Promise<DashboardData> {
  const variables = periodQueries();

  // Run sequentially so logs show which query fails (customers vs orders).
  console.log("[access-diag] dashboard customersCount query starting");
  const customers = await runQuery<CountResult>(admin, CUSTOMERS_QUERY, variables);
  console.log(
    "[access-diag] dashboard customersCount:",
    customers ? "OK" : "FAILED",
  );

  console.log("[access-diag] dashboard ordersCount query starting");
  const orders = await runQuery<CountResult>(admin, ORDERS_QUERY, variables);
  console.log(
    "[access-diag] dashboard ordersCount:",
    orders ? "OK" : "FAILED",
  );

  return {
    customers: customers ? mapCounts(customers) : unavailable,
    orders: orders ? mapCounts(orders) : unavailable,
  };
}
