import { Link, data, redirect, useFetcher, useLoaderData } from "react-router";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import { formatNumber } from "app/utils/formatNumber";
import { periodLabel } from "app/utils/roi";
import { deleteRoi, getRoi } from "app/utils/roi.server";

async function authorize(request: Request) {
  const auth = await authenticate.admin(request);
  const permissions = await getPermissions(auth.session.shop);
  if (permissions?.termsAccepted !== true) throw new Response(null, { status: 302, headers: { Location: "/app" } });
  return auth;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authorize(request);
  const record = params.id ? await getRoi(session.shop, params.id) : null;
  if (!record) throw new Response("ROI calculation not found", { status: 404 });
  return { record };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authorize(request);
  if (!params.id) throw data({ message: "ROI calculation not found." }, { status: 404 });
  try {
    const result = await deleteRoi(session.shop, params.id);
    if (!result.count) throw data({ message: "ROI calculation not found." }, { status: 404 });
    return redirect("/app/roi-calculator?message=deleted");
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Failed to delete ROI calculation:", error);
    return redirect("/app/roi-calculator?message=delete-error");
  }
}

export default function RoiDetails() {
  const { record } = useLoaderData<typeof loader>();
  const deleteFetcher = useFetcher();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <main className="custom-page">
      <section className="custom-panel feedback-panel">
        <Link className="wizard-back" to="/app/roi-calculator">← Back to ROI Calculation</Link>
        <p className="custom-eyebrow">Adbuffs Onboard</p>
        <h1 className="custom-title">ROI Calculation Details</h1>
        <dl className="feedback-details">
          <dt>Reporting period</dt><dd>{periodLabel(record.periodDays)}</dd>
          <dt>Gross Sales</dt><dd>{formatNumber(record.grossSales)}</dd>
          <dt>Orders</dt><dd>{formatNumber(record.orders, 0)}</dd>
          <dt>New Customers</dt><dd>{formatNumber(record.newCustomers, 0)}</dd>
          <dt>Total Sessions</dt><dd>{formatNumber(record.totalSessions, 0)}</dd>
          <dt>Spends</dt><dd>{formatNumber(record.spends)}</dd>
          <dt>Created At</dt><dd>{record.createdAt.toLocaleString()}</dd>
          <dt>Updated At</dt><dd>{record.updatedAt.toLocaleString()}</dd>
        </dl>
        <h2 className="roi-section-title">ROI calculated Result with above values</h2>
        <dl className="feedback-details">
          <dt>ROI</dt><dd className={record.roi < 1 ? "roi-negative" : "roi-positive"}>{formatNumber(record.roi)}</dd>
          <dt>Cost per Order</dt><dd>{formatNumber(record.costPerOrder)}</dd>
          <dt>New Customer Acquisition Cost</dt><dd>{formatNumber(record.ncac)}</dd>
          <dt>Cost per Session</dt><dd>{formatNumber(record.costPerSession)}</dd>
        </dl>
        <div className="feedback-actions">
          <Link className="custom-button" to={`/app/roi-calculator/${record.id}/edit`}>Edit</Link>
          <button className="danger-button" type="button" onClick={() => setConfirmingDelete(true)}>Delete</button>
        </div>
        {confirmingDelete && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="modal-card delete-dialog">
              <h2 id="delete-title">Delete ROI Calculation?</h2>
              <p>Are you sure you want to delete this ROI calculation? This action cannot be undone.</p>
              <div className="feedback-actions">
                <button className="custom-secondary" type="button" onClick={() => setConfirmingDelete(false)}>Cancel</button>
                <deleteFetcher.Form method="post">
                  <button className="danger-button" type="submit" disabled={deleteFetcher.state !== "idle"}>
                    {deleteFetcher.state !== "idle" ? "Deleting..." : "Delete"}
                  </button>
                </deleteFetcher.Form>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
