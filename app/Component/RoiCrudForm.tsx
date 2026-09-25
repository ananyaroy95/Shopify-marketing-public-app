import { Form, Link } from "react-router";
import { useEffect, useState, type ReactNode } from "react";
import { formatNumber } from "app/utils/formatNumber";
import { calculateRoi, validateRoi } from "app/utils/roi";
import type { RoiErrors, RoiInput, RoiMetrics } from "app/utils/roi";

type Props = {
  values?: RoiInput;
  errors?: RoiErrors;
  submitting?: boolean;
  cancelTo: string;
  heading?: ReactNode;
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
  { name: "grossSales", label: "Gross Sales", step: "0.01", placeholder: "For example: 250000" },
  { name: "orders", label: "Orders", step: "1", placeholder: "For example: 500" },
  { name: "newCustomers", label: "New Customers", step: "1", placeholder: "For example: 180" },
  { name: "totalSessions", label: "Total Sessions", step: "1", placeholder: "For example: 12000" },
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

export default function RoiCrudForm({ values = emptyValues, errors: serverErrors, submitting = false, cancelTo, heading }: Props) {
  const [input, setInput] = useState<RoiInput>(values);
  const [fieldErrors, setFieldErrors] = useState<RoiErrors>(serverErrors ?? {});
  const [metrics, setMetrics] = useState<RoiMetrics | null>(null);
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
    setFieldErrors(nextErrors);
    setMetrics(Object.keys(nextErrors).length ? null : calculateRoi(input));
  }

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
            onChange={(event) => updateField("periodDays", Number(event.target.value))}
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="28">Last 28 days</option>
          </select>
          {fieldErrors.periodDays && <span className="field-error" role="alert">{fieldErrors.periodDays}</span>}
        </label>
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
              placeholder={field.placeholder}
              value={fieldValue(input[field.name])}
              aria-invalid={Boolean(fieldErrors[field.name])}
              onChange={(event) => updateField(field.name, parseAmount(event.target.value))}
            />
            {fieldErrors[field.name] && <span className="field-error" role="alert">{fieldErrors[field.name]}</span>}
          </label>
        ))}
        <div className="feedback-actions">
          <button className="custom-button" type="button" onClick={showResults}>View Calculation</button>
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
