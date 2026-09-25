import { useState } from "react";
import { Link } from "react-router";

import greetingCss from "app/Component/greeting.css?inline";

import type { CountDashboard, CountPoint, DashboardData } from "app/utils/dashboard.server";

const emptyPoints: CountPoint[] = [
  { label: "Last 1 Year", count: 0 },
  { label: "Last 6 Months", count: 0 },
  { label: "Last 3 Months", count: 0 },
  { label: "Last 1 Month", count: 0 },
  { label: "Today", count: 0 },
];

const emptyDashboard: DashboardData = {
  customers: { available: false, points: emptyPoints },
  orders: { available: false, points: emptyPoints },
};

const DEFAULT_PERIOD = "Today";

function formatCount(count: number) {
  return count < 10 ? String(count).padStart(2, "0") : String(count);
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

        <section className="dash-section" aria-labelledby="customer-data-title">
          <div className="dash-section-head">
            <h2 id="customer-data-title">Customer data</h2>
            <p>Latest customers from your Shopify store.</p>
          </div>
          <CountSection
            data={data.customers}
            emptyLabel="Customer data could not be loaded."
            noun="customers"
          />
        </section>

        <section className="dash-section" aria-labelledby="order-data-title">
          <div className="dash-section-head">
            <h2 id="order-data-title">Order data</h2>
            <p>Latest orders from your Shopify store.</p>
          </div>
          <CountSection
            data={data.orders}
            emptyLabel="Order data could not be loaded."
            noun="orders"
          />
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

  return <CountChart points={data.points} noun={noun} />;
}

function CountChart({ points, noun }: { points: CountPoint[]; noun: string }) {
  const defaultPoint = points.find((point) => point.label === DEFAULT_PERIOD) ?? points[points.length - 1];
  const [selectedLabel, setSelectedLabel] = useState(defaultPoint?.label ?? DEFAULT_PERIOD);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const activeLabel = hoveredLabel ?? selectedLabel;
  const activePoint = points.find((point) => point.label === activeLabel) ?? defaultPoint;
  const max = Math.max(...points.map((point) => point.count), 1);
  const summary = points.map((point) => `${point.label}: ${point.count}`).join(", ");

  return (
    <div className="count-layout">
      <div
        className="count-chart"
        role="listbox"
        aria-label={summary}
        aria-activedescendant={activePoint ? `count-option-${activePoint.label}` : undefined}
        onMouseLeave={() => setHoveredLabel(null)}
      >
        {points.map((point) => {
          const height = point.count === 0 ? 0 : Math.max((point.count / max) * 100, 8);
          const isActive = point.label === activeLabel;
          const isSelected = point.label === selectedLabel;

          return (
            <button
              type="button"
              className={`count-chart-col${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}`}
              key={point.label}
              id={`count-option-${point.label}`}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => setHoveredLabel(point.label)}
              onFocus={() => setHoveredLabel(point.label)}
              onBlur={() => setHoveredLabel(null)}
              onClick={() => setSelectedLabel(point.label)}
            >
              <span className="count-chart-value">{formatCount(point.count)}</span>
              <div className="count-chart-track">
                <div className="count-chart-bar" style={{ height: `${height}%` }} />
              </div>
              <span className="count-chart-label">{point.label}</span>
            </button>
          );
        })}
      </div>

      <aside className="count-highlight" aria-live="polite">
        <p className="count-highlight-label">{activePoint?.label ?? DEFAULT_PERIOD}</p>
        <p className="count-highlight-value">{formatCount(activePoint?.count ?? 0)}</p>
        <p className="count-highlight-meta">
          {activePoint?.label === "Today"
            ? `Today ${noun}`
            : `· ${activePoint?.label ?? ""} ${noun}`}
        </p>
      </aside>
    </div>
  );
}
