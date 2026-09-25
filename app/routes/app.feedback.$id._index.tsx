import { Link, data, redirect, useFetcher, useLoaderData } from "react-router";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import { deleteFeedback, getFeedback } from "app/utils/feedback.server";

async function authorize(request: Request) {
  const auth = await authenticate.admin(request);
  const permissions = await getPermissions(auth.session.shop);
  if (permissions?.termsAccepted !== true) throw new Response(null, { status: 302, headers: { Location: "/app" } });
  return auth;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authorize(request);
  const record = params.id ? await getFeedback(session.shop, params.id) : null;
  if (!record) throw new Response("Feedback not found", { status: 404 });
  return { record };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authorize(request);
  if (!params.id) throw data({ message: "Feedback not found." }, { status: 404 });
  try {
    const result = await deleteFeedback(session.shop, params.id);
    if (!result.count) throw data({ message: "Feedback not found." }, { status: 404 });
    return redirect("/app/feedback?message=deleted");
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Failed to delete feedback:", error);
    return redirect("/app/feedback?message=delete-error");
  }
}

export default function FeedbackDetails() {
  const { record } = useLoaderData<typeof loader>();
  const deleteFetcher = useFetcher();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <main className="custom-page">
      <section className="custom-panel feedback-panel">
        <Link className="wizard-back" to="/app/feedback">← Back to Feedback</Link>
        <p className="custom-eyebrow">Adbuffs Onboard</p>
        <h1 className="custom-title">Feedback Details</h1>
        <dl className="feedback-details">
          <dt>Company Name</dt><dd>{record.companyName}</dd>
          <dt>Brand Name</dt><dd>{record.brandName || "-"}</dd>
          <dt>Website URL</dt><dd>{record.websiteUrl ? <a href={record.websiteUrl} target="_blank" rel="noreferrer">{record.websiteUrl}</a> : "-"}</dd>
          <dt>How did you hear about us?</dt><dd>{record.howDidYouHear || "-"}</dd>
          <dt>Associated with Adbuffs?</dt><dd>{record.associatedWithAdbuffs || "-"}</dd>
          <dt>Feedback</dt><dd className="details-feedback">{record.feedback}</dd>
          <dt>Created At</dt><dd>{record.createdAt.toLocaleString()}</dd>
          <dt>Updated At</dt><dd>{record.updatedAt.toLocaleString()}</dd>
        </dl>
        <div className="feedback-actions">
          <Link className="custom-button" to={`/app/feedback/${record.id}/edit`}>Edit</Link>
          <button className="danger-button" type="button" onClick={() => setConfirmingDelete(true)}>Delete</button>
        </div>
        {confirmingDelete && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="modal-card delete-dialog">
              <h2 id="delete-title">Delete Feedback?</h2>
              <p>Are you sure you want to delete this feedback? This action cannot be undone.</p>
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
