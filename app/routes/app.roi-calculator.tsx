import { useFetcher, Link, redirect, data } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import { readOnboardingProgress, withOnboardingStep } from "app/utils/onboardingProgressCookie.server";
import "app/style/custom.css";

const PERIODS = [7, 14, 28] as const;

type CalculatorResult = {
  periodDays: number;
  roi: number;
  costPerOrder: number;
  ncac: number;
  costPerSession: number;
};

function readNumber(formData: FormData, name: string) {
  const value = Number(formData.get(name));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  // Merchants who already completed the checklist under a prior version of the
  // flow (before this step existed) shouldn't be forced through it retroactively.
  const existing = await getPermissions(session.shop);
  if (existing?.termsAccepted !== true) {
    const progress = readOnboardingProgress(request);
    if (!progress.feedbackSubmitted) {
      return redirect("/app/feedback");
    }
  }

  return null;
}

type RoiActionResult = { result?: CalculatorResult; error?: string };

export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);
  const formData = await request.formData();
  const grossSales = readNumber(formData, "grossSales");
  const orders = readNumber(formData, "orders");
  const newCustomers = readNumber(formData, "newCustomers");
  const totalSessions = readNumber(formData, "totalSessions");
  const spends = readNumber(formData, "spends");
  const periodDays = Number(formData.get("periodDays"));

  if (
    grossSales === null ||
    orders === null ||
    newCustomers === null ||
    totalSessions === null ||
    spends === null ||
    !PERIODS.includes(periodDays as (typeof PERIODS)[number])
  ) {
    return data<RoiActionResult>({ error: "Please enter valid values for all five monthly fields." });
  }

  // Monthly values are pro-rated to the selected reporting window using 28 days.
  const periodMultiplier = periodDays / 28;
  const salesForPeriod = grossSales * periodMultiplier;
  const ordersForPeriod = orders * periodMultiplier;
  const newCustomersForPeriod = newCustomers * periodMultiplier;
  const sessionsForPeriod = totalSessions * periodMultiplier;
  const spendForPeriod = spends * periodMultiplier;

  const result: CalculatorResult = {
    periodDays,
    roi: spendForPeriod > 0 ? ((salesForPeriod - spendForPeriod) / spendForPeriod) * 100 : 0,
    costPerOrder: ordersForPeriod > 0 ? spendForPeriod / ordersForPeriod : 0,
    ncac: newCustomersForPeriod > 0 ? spendForPeriod / newCustomersForPeriod : 0,
    costPerSession: sessionsForPeriod > 0 ? spendForPeriod / sessionsForPeriod : 0,
  };

  // Only a short-lived cookie remembers this step is done — nothing is written to the database.
  return data<RoiActionResult>(
    { result },
    { headers: { "Set-Cookie": withOnboardingStep(request, "roi") } },
  );
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export default function RoiCalculator() {
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data?.result;
  const isSubmitting = fetcher.state !== "idle";

  return (
    <main className="custom-page">
      <section className="custom-panel roi-panel">
        <div className="wizard-nav">
          <Link to="/app/feedback" className="wizard-back">← Back</Link>
        </div>

        <p className="custom-eyebrow">Adbuffs Onboard</p>
        <h1 className="custom-title">ROI Calculator</h1>
        <p className="custom-intro">
          Enter your monthly brand metrics to calculate campaign efficiency for a selected reporting period.
        </p>

        <fetcher.Form method="post" className="custom-form roi-layout">
          <section className="custom-form roi-form" aria-label="ROI calculator inputs">
            <label>
              Reporting period
              <select className="custom-select" name="periodDays" defaultValue="28">
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="28">Last 28 days</option>
              </select>
            </label>

            <label>
              Gross Sales
              <input className="custom-input" name="grossSales" type="number" min="0" step="0.01" inputMode="decimal" placeholder="For example: 250000" required />
            </label>
            <label>
              Orders
              <input className="custom-input" name="orders" type="number" min="0" step="1" inputMode="numeric" placeholder="For example: 500" required />
            </label>
            <label>
              New Customers
              <input className="custom-input" name="newCustomers" type="number" min="0" step="1" inputMode="numeric" placeholder="For example: 180" required />
            </label>
            <label>
              Total Sessions
              <input className="custom-input" name="totalSessions" type="number" min="0" step="1" inputMode="numeric" placeholder="For example: 12000" required />
            </label>
            <label>
              Spends
              <input className="custom-input" name="spends" type="number" min="0" step="0.01" inputMode="decimal" placeholder="For example: 50000" required />
            </label>
            <button className="custom-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Calculating…" : "Calculate ROI"}</button>
          </section>

          <section className="roi-results" aria-live="polite">
            <p className="roi-results-title">Your insights</p>
            {fetcher.data?.error ? (
              <p className="roi-error">{fetcher.data.error}</p>
            ) : result ? (
              <>
                <p className="roi-period">Estimated for the selected {result.periodDays}-day period</p>
                <div className="roi-result-card"><span>ROI</span><strong className={result.roi < 0 ? "roi-negative" : "roi-positive"}>{formatNumber(result.roi, 1)}%</strong></div>
                <div className="roi-result-card"><span>Cost per Order</span><strong>{formatNumber(result.costPerOrder)}</strong></div>
                <div className="roi-result-card"><span>New Customer Acquisition Cost</span><strong>{formatNumber(result.ncac)}</strong></div>
                <div className="roi-result-card"><span>Cost per Session</span><strong>{formatNumber(result.costPerSession)}</strong></div>
                <Link to="/app" className="wizard-next">Next</Link>
              </>
            ) : (
              <p className="roi-empty">Enter all monthly figures, select a period, and calculate to see your insights.</p>
            )}
          </section>
        </fetcher.Form>

        <p className="custom-note roi-note">
          ROI = (Gross Sales − Spends) ÷ Spends × 100. Cost metrics use the same selected-period share of your monthly data and are displayed in the currency units you enter.
        </p>
      </section>
    </main>
  );
}
