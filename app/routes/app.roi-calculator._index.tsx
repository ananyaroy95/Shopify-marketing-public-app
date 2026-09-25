import { Link, data, redirect, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import { formatNumber } from "app/utils/formatNumber";
import { periodLabel } from "app/utils/roi";
import { deleteRoi, listRoi } from "app/utils/roi.server";

function ActionGlyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      {children}
    </svg>
  );
}

async function authorize(request: Request) {
  const auth = await authenticate.admin(request);
  const permissions = await getPermissions(auth.session.shop);
  if (permissions?.termsAccepted !== true) throw new Response(null, { status: 302, headers: { Location: "/app" } });
  return auth;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authorize(request);
  try {
    return { records: await listRoi(session.shop) };
  } catch (error) {
    console.error("Failed to load ROI calculations:", error);
    throw data({ message: "Unable to load ROI calculations right now." }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authorize(request);
  const formData = await request.formData();
  const id = String(formData.get("id") ?? "");
  if (formData.get("intent") !== "delete" || !id) {
    return redirect("/app/roi-calculator?message=delete-error");
  }
  try {
    const result = await deleteRoi(session.shop, id);
    return redirect(`/app/roi-calculator?message=${result.count ? "deleted" : "delete-error"}`);
  } catch (error) {
    console.error("Failed to delete ROI calculation:", error);
    return redirect("/app/roi-calculator?message=delete-error");
  }
}

export default function RoiList() {
  const { records } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const deleteFetcher = useFetcher();
  const message = searchParams.get("message");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteState = useRef(deleteFetcher.state);
  const isSuccess = message === "created" || message === "updated" || message === "deleted";

  useEffect(() => {
    if (deleteState.current !== "idle" && deleteFetcher.state === "idle") setDeletingId(null);
    deleteState.current = deleteFetcher.state;
  }, [deleteFetcher.state]);

  useEffect(() => {
    if (!isSuccess) return;
    const timer = window.setTimeout(() => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("message");
        return next;
      }, { replace: true });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isSuccess, setSearchParams]);

  return (
    <main className="custom-page">
      <section className="custom-panel feedback-list-panel">
        <div className="page-heading-row">
          <div>
            <p className="custom-eyebrow">Adbuffs Onboard</p>
            <h1 className="custom-title">ROI Calculation</h1>
            <p className="custom-intro">Review ROI calculations saved for this Shopify store.</p>
          </div>
          <Link className="custom-button compact-button" to="/app/roi-calculator/new">+ Add ROI Calculation</Link>
        </div>
        {message === "created" && <p className="success-banner" role="status">ROI calculation added successfully.</p>}
        {message === "updated" && <p className="success-banner" role="status">ROI calculation updated successfully.</p>}
        {message === "deleted" && <p className="success-banner" role="status">ROI calculation deleted successfully.</p>}
        {message === "delete-error" && <p className="custom-error" role="alert">Unable to delete this ROI calculation.</p>}
        {records.length === 0 ? (
          <div className="empty-state">
            <h2>No ROI calculations yet</h2>
            <p>You haven&apos;t saved any ROI calculations yet.<br />Add your first calculation to get started.</p>
            <Link className="custom-button compact-button" to="/app/roi-calculator/new">+ Add ROI Calculation</Link>
          </div>
        ) : (
          <div className="feedback-table-wrap">
            <table className="feedback-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Gross Sales</th>
                  <th>Orders</th>
                  <th>Spends</th>
                  <th>ROI</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{periodLabel(record.periodDays)}</td>
                    <td>{formatNumber(record.grossSales)}</td>
                    <td>{formatNumber(record.orders, 0)}</td>
                    <td>{formatNumber(record.spends)}</td>
                    <td className={record.roi < 1 ? "roi-negative" : "roi-positive"}>{formatNumber(record.roi)}</td>
                    <td>{record.createdAt.toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions">
                        <Link className="action-view" to={`/app/roi-calculator/${record.id}`} title="View" aria-label="View">
                          <ActionGlyph><path d="M2.5 10S5.5 4.5 10 4.5 17.5 10 17.5 10 14.5 15.5 10 15.5 2.5 10 2.5 10z" /><circle cx="10" cy="10" r="2.2" /></ActionGlyph>
                        </Link>
                        <Link className="action-edit" to={`/app/roi-calculator/${record.id}/edit`} title="Edit" aria-label="Edit">
                          <ActionGlyph><path d="M12.2 3.4l4.4 4.4L7.2 17.2H2.8v-4.4L12.2 3.4z" /></ActionGlyph>
                        </Link>
                        <button className="action-delete" type="button" title="Delete" aria-label="Delete" onClick={() => setDeletingId(record.id)}>
                          <ActionGlyph><path d="M4 6h12M8 6V3.8h4V6M6.2 6l.7 10.2h6.2L13.8 6" /></ActionGlyph>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {deletingId && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="modal-card delete-dialog">
              <h2 id="delete-title">Delete ROI Calculation?</h2>
              <p>Are you sure you want to delete this ROI calculation? This action cannot be undone.</p>
              <div className="feedback-actions">
                <button className="custom-secondary" type="button" onClick={() => setDeletingId(null)}>Cancel</button>
                <deleteFetcher.Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={deletingId} />
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
