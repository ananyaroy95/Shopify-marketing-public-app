import { Form, Link, useFetcher } from "react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { formatNumber } from "app/utils/formatNumber";
import { calculateRoi, validateRoi } from "app/utils/roi";
import type { RoiErrors, RoiInput, RoiMetrics } from "app/utils/roi";

type Props = {
  values?: RoiInput;
  errors?: RoiErrors;
  submitting?: boolean;
  cancelTo: string;
  heading?: ReactNode;
  autoFetchMetrics?: boolean;
};

const emptyValues: RoiInput = {
  periodDays: 28,
  grossSales: Number.NaN,
  orders: Number.NaN,
  newCustomers: Number.NaN,
  totalSessions: Number.NaN,
  spends: Number.NaN,
};

const fields: Array<{ name: keyof Omit<RoiInput, "periodDays">; label: string; required?: boolean; step: string; placeholder: string }> = [
  { name: "grossSales", label: "Gross Sales", step: "0.01", placeholder: "Loaded from Shopify" },
  { name: "orders", label: "Orders", step: "1", placeholder: "Loaded from Shopify" },
  { name: "newCustomers", label: "New Customers", step: "1", placeholder: "Loaded from Shopify" },
  { name: "totalSessions", label: "Total Sessions", step: "1", placeholder: "Loaded from Shopify" },
  { name: "spends", label: "Spends", required: true, step: "0.01", placeholder: "For example: 50000" },
];

function fieldValue(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

function parseAmount(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return Number.NaN;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
}

type MetricsFetcherData = {
  intent?: "fetchShopifyMetrics";
  periodDays?: number;
  metrics?: Pick<RoiInput, "grossSales" | "orders" | "newCustomers" | "totalSessions">;
  fetchError?: string;
};

export default function RoiCrudForm({
  values = emptyValues,
  errors: serverErrors,
  submitting = false,
  cancelTo,
  heading,
  autoFetchMetrics = false,
}: Props) {
  const [input, setInput] = useState<RoiInput>(values);
  const [fieldErrors, setFieldErrors] = useState<RoiErrors>(serverErrors ?? {});
  const [metrics, setMetrics] = useState<RoiMetrics | null>(null);
  const metricsFetcher = useFetcher<MetricsFetcherData>();
  const submitMetrics = metricsFetcher.submit;
  const initialFetchStarted = useRef(false);

  const fetchMetrics = useCallback((periodDays: number) => {
    submitMetrics(
      { intent: "fetchShopifyMetrics", periodDays: String(periodDays) },
      { method: "post" },
    );
  }, [submitMetrics]);

  useEffect(() => {
    if (autoFetchMetrics && !initialFetchStarted.current) {
      initialFetchStarted.current = true;
      fetchMetrics(input.periodDays);
    }
  }, [autoFetchMetrics, fetchMetrics, input.periodDays]);

  useEffect(() => {
    const response = metricsFetcher.data;
    if (
      metricsFetcher.state !== "idle" ||
      response?.intent !== "fetchShopifyMetrics" ||
      response.periodDays !== input.periodDays
    ) {
      return;
    }

    if (response.metrics) {
      setInput((current) =>
        current.periodDays === response.periodDays
          ? { ...current, ...response.metrics }
          : current,
      );
    }
  }, [input.periodDays, metricsFetcher.data, metricsFetcher.state]);

  useEffect(() => {
    if (serverErrors) setFieldErrors(serverErrors);
  }, [serverErrors]);

  function updateField<K extends keyof RoiInput>(name: K, value: RoiInput[K]) {
    setInput((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setMetrics(null);
  }

  function showResults() {
    const nextErrors = validateRoi(input);
    if (autoFetchMetrics) {
      for (const field of ["grossSales", "orders", "newCustomers", "totalSessions"] as const) {
        if (!Number.isFinite(input[field])) {
          nextErrors[field] = "Load this value from Shopify or enter it manually.";
        }
      }
    }
    setFieldErrors(nextErrors);
    setMetrics(Object.keys(nextErrors).length ? null : calculateRoi(input));
  }

  function changePeriod(periodDays: number) {
    updateField("periodDays", periodDays);
    if (autoFetchMetrics) {
      setInput((current) => ({
        ...current,
        periodDays,
        grossSales: Number.NaN,
        orders: Number.NaN,
        newCustomers: Number.NaN,
        totalSessions: Number.NaN,
      }));
      fetchMetrics(periodDays);
    }
  }

  const currentFetchError = metricsFetcher.data?.periodDays === input.periodDays ? metricsFetcher.data.fetchError : undefined;
  const metricsLoaded = metricsFetcher.data?.periodDays === input.periodDays && Boolean(metricsFetcher.data.metrics);

  return (
    <div className="roi-layout">
      <div className="roi-editor-main">
        {heading}
      <Form method="post" id="roi-crud-form" className="custom-form roi-form">
        <label>
          <span>Reporting period</span>
          <select
            className="custom-select"
            name="periodDays"
            value={String(input.periodDays)}
            aria-invalid={Boolean(fieldErrors.periodDays)}
            onChange={(event) => changePeriod(Number(event.target.value))}
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="28">Last 28 days</option>
          </select>
          {fieldErrors.periodDays && <span className="field-error" role="alert">{fieldErrors.periodDays}</span>}
        </label>
        {autoFetchMetrics && metricsFetcher.state !== "idle" && (
          <p aria-live="polite" class="shopify-intro">Loading Shopify data for this period…</p>
        )}
        {autoFetchMetrics && currentFetchError && (
          <p className="custom-error" role="alert">{currentFetchError}</p>
        )}
        {autoFetchMetrics && metricsLoaded && (
          <p aria-live="polite" class="shopify-intro">Shopify data loaded for the selected period. You can adjust the values before saving.</p>
        )}
        {fields.map((field) => (
          <label key={field.name}>
            <span>
              {field.label}
              {field.required && <span className="custom-required" aria-hidden="true"> *</span>}
            </span>
            <input
              className="custom-input"
              name={field.name}
              type="number"
              min="0"
              step={field.step}
              inputMode={field.step === "1" ? "numeric" : "decimal"}
              placeholder={autoFetchMetrics ? field.placeholder : `Enter ${field.label.toLowerCase()}`}
              value={fieldValue(input[field.name])}
              aria-invalid={Boolean(fieldErrors[field.name])}
              onChange={(event) => updateField(field.name, parseAmount(event.target.value))}
            />
            {fieldErrors[field.name] && <span className="field-error" role="alert">{fieldErrors[field.name]}</span>}
          </label>
        ))}
        <div className="feedback-actions">
          <button className="custom-button" type="button" onClick={showResults} disabled={autoFetchMetrics && metricsFetcher.state !== "idle"}>View Calculation</button>
          <Link className="custom-secondary" to={cancelTo}>Cancel</Link>
        </div>
      </Form>
      </div>
      {metrics ? (
        <aside className="roi-results" aria-live="polite">
          <h2 className="roi-results-title">ROI calculated Result</h2>
          <div className="roi-result-card"><span>ROI</span><strong className={metrics.roi < 1 ? "roi-negative" : "roi-positive"}>{formatNumber(metrics.roi)}</strong></div>
          <div className="roi-result-card"><span>Cost per Order</span><strong>{formatNumber(metrics.costPerOrder)}</strong></div>
          <div className="roi-result-card"><span>New Customer Acquisition Cost</span><strong>{formatNumber(metrics.ncac)}</strong></div>
          <div className="roi-result-card"><span>Cost per Session</span><strong>{formatNumber(metrics.costPerSession)}</strong></div>
          <div className="feedback-actions">
            <button className="custom-button" type="submit" form="roi-crud-form" disabled={submitting}>
              {submitting ? "Saving..." : "Save Calculation"}
            </button>
          </div>
        </aside>
      ) : (
        <aside className="roi-results-empty" aria-live="polite">
          <h2>No results yet</h2>
          <p>Enter the monthly metrics and click View Calculation. The ROI results will show here.</p>
        </aside>
      )}
    </div>
  );
}
