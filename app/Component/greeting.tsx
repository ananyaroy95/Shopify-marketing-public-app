import { Link } from "react-router";

import greetingCss from "app/Component/greeting.css?inline";

import type { CountDashboard, DashboardData } from "app/utils/dashboard.server";

const emptyDashboard: DashboardData = {
  customers: { available: false, total: 0, precision: "EXACT" },
  orders: { available: false, total: 0, precision: "EXACT" },
};

function formatCount(count: number) {
  return new Intl.NumberFormat("en-US").format(count);
}

export default function GreetingPage({ dashboard = emptyDashboard }: { dashboard?: DashboardData | null }) {
  const data = dashboard ?? emptyDashboard;

  return (
    <div className="setup-page">
      <style dangerouslySetInnerHTML={{ __html: greetingCss }} />
      <div className="setup-main">
        <div className="setuped-content">
          <h1>🎉 Setup Completed!</h1>
          <p className="primary-text">Thank you for installing Adbuffs Onboard and granting the necessary permissions. The app will now securely access the data required to operate and help you get the best results from your campaigns.</p>
          <p className="primary-text">You’re ready to take full advantage of everything this app has to offer. Let’s get started!</p>
          <p className="info-text">If you need help later, you can always manage settings or contact support from inside the app.</p>
        </div>

        <section className="dash-section" aria-labelledby="customer-order-data-title">
          <div className="dash-section-head">
            <h2 id="customer-order-data-title">Customer &amp; Order data</h2>
            <p>Today&apos;s customers &amp; orders from your Shopify store.</p>
          </div>
          <div className="count-highlights">
            <CountSection
              data={data.customers}
              emptyLabel="Customer data could not be loaded."
              noun="customers"
            />
            <CountSection
              data={data.orders}
              emptyLabel="Order data could not be loaded."
              noun="orders"
            />
          </div>
        </section>

        <div className="dash-actions">
          <Link className="custom-button" to="/app/feedback/new">Feedback</Link>
          <Link className="custom-button" to="/app/roi-calculator/new">ROI Calculation</Link>
        </div>
      </div>
    </div>
  );
}

function CountSection({
  data,
  emptyLabel,
  noun,
}: {
  data: CountDashboard;
  emptyLabel: string;
  noun: string;
}) {
  if (!data.available) {
    return <p className="info-text dash-empty">{emptyLabel}</p>;
  }

  return (
    <aside className="count-highlight" aria-live="polite">
      <p className="count-highlight-label">Today</p>
      <p className="count-highlight-value">{formatCount(data.total)}</p>
      <p className="count-highlight-meta">
        {data.precision === "EXACT" ? `Today ${noun}` : `At least ${noun} today`}
      </p>
    </aside>
  );
}
