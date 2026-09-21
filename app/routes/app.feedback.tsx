import { Link, data, useActionData, useLoaderData, useNavigation, Form } from "react-router";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { readOnboardingProgress, withOnboardingStep } from "app/utils/onboardingProgressCookie.server";
// Enable this import when Resend email delivery is configured in .env.
// import { sendFeedbackEmails } from "app/utils/email.server";
import "app/style/custom.css";

type FeedbackFields = {
  companyName: string;
  brandName: string;
  websiteUrl: string;
  discoverySource: string;
  associationStatus: string;
  experienceRating: string;
  feedback: string;
  storeOwnerName: string;
  storeOwnerEmail: string;
};

function readField(formData: FormData, name: keyof FeedbackFields) {
  return String(formData.get(name) ?? "").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

type FeedbackActionResult = { success: boolean; error?: string };

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const progress = readOnboardingProgress(request);
  let storeOwnerName = "";
  let storeOwnerEmail = "";

  try {
    const response = await admin.graphql(`
      query {
        shop {
          shopOwnerName
          email
        }
      }
    `);
    const json = await response.json();
    const shop = json.data?.shop;
    storeOwnerName = shop?.shopOwnerName ?? "";
    storeOwnerEmail = shop?.email ?? "";
  } catch (error) {
    console.error("Failed to load store owner details for feedback form:", error);
  }

  return {
    shop: session.shop,
    storeOwnerName,
    storeOwnerEmail,
    alreadySubmitted: progress.feedbackSubmitted,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);
  const formData = await request.formData();
  const fields: FeedbackFields = {
    companyName: readField(formData, "companyName"),
    brandName: readField(formData, "brandName"),
    websiteUrl: readField(formData, "websiteUrl"),
    discoverySource: readField(formData, "discoverySource"),
    associationStatus: readField(formData, "associationStatus"),
    experienceRating: readField(formData, "experienceRating"),
    feedback: readField(formData, "feedback"),
    storeOwnerName: readField(formData, "storeOwnerName"),
    storeOwnerEmail: readField(formData, "storeOwnerEmail"),
  };

  const requiredFields: Array<[keyof FeedbackFields, string]> = [
    ["companyName", "Company Name"],
    ["feedback", "Share your Feedback"],
  ];

  const missingField = requiredFields.find(([key]) => !fields[key]);
  if (missingField) {
    return data<FeedbackActionResult>({ success: false, error: `${missingField[1]} is required.` });
  }

  if (fields.websiteUrl && !isUrl(fields.websiteUrl)) {
    return data<FeedbackActionResult>({ success: false, error: "Please enter a valid Website URL." });
  }

  if (fields.storeOwnerEmail && !isEmail(fields.storeOwnerEmail)) {
    return data<FeedbackActionResult>({ success: false, error: "Please enter a valid Store Owner Email." });
  }

  // Email delivery is intentionally disabled during this initial feedback-flow test.
  // Restore this block after adding RESEND_API_KEY, APP_OWNER_EMAIL, and
  // EMAIL_FROM_ADDRESS to .env:
  //
  // try {
  //   await sendFeedbackEmails({ ...fields, shop: session.shop });
  // } catch (error) {
  //   console.error("Failed to send feedback emails:", error);
  //   return { error: "We could not send your feedback. Please try again later." };
  // }
  //
  // The submitted details are currently validated only; they are not stored or sent.
  // Only a short-lived cookie remembers this step is done — nothing is written to the database.
  return data<FeedbackActionResult>(
    { success: true },
    { headers: { "Set-Cookie": withOnboardingStep(request, "feedback") } },
  );
}

export default function Feedback() {
  const { storeOwnerName, storeOwnerEmail, alreadySubmitted } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const [associationStatus, setAssociationStatus] = useState("");
  const [experienceRating, setExperienceRating] = useState("");
  const isSubmitting = navigation.state === "submitting";

  if (result?.success || alreadySubmitted) {
    return (
      <main className="custom-page">
        <section className="custom-panel feedback-success">
          <h1 className="custom-title">Thank you for your Feedback</h1>
          <p className="custom-note">Your feedback submitted successfully.</p>
          <Link to="/app/roi-calculator" className="wizard-next">Next</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="custom-page">
      <section className="custom-panel feedback-panel">
        <p className="custom-eyebrow">Adbuffs Onboard</p>
        <h1 className="custom-title">Share your Feedback</h1>
        <p className="custom-intro">Tell us about your experience. Your feedback helps us improve the service.</p>

        {result?.error && <p className="custom-error" role="alert">{result.error}</p>}

        <Form method="post" className="custom-form">
          <label>
            <div>Company Name <span className="custom-required" aria-hidden="true">*</span></div>
            <input className="custom-input" name="companyName" placeholder="Enter your company name" required maxLength={200} />
          </label>

          <label>
            Brand Name
            <input className="custom-input" name="brandName" placeholder="Enter your brand name" maxLength={200} />
          </label>

          <label>
            Website URL
            <input className="custom-input" name="websiteUrl" type="url" placeholder="https://example.com" maxLength={500} />
          </label>

          <label>
            How did you come to know about us?
            <textarea className="custom-textarea" name="discoverySource" placeholder="Tell us where you heard about Adbuffs" rows={3} maxLength={1000} />
          </label>

          <label>
            Are you currently associated with Adbuffs?
            <select
              name="associationStatus"
              className={`custom-select ${associationStatus ? "" : "custom-select-placeholder"}`}
              value={associationStatus}
              onChange={(event) => {
                setAssociationStatus(event.target.value);
                setExperienceRating("");
              }}
            >
              <option value="">Select an option</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Discussions Ongoing">Discussions Ongoing</option>
            </select>
          </label>

          {associationStatus === "Yes" && (
            <label>
              Rate your experience
              <select
                name="experienceRating"
                className={`custom-select ${experienceRating ? "" : "custom-select-placeholder"}`}
                value={experienceRating}
                onChange={(event) => setExperienceRating(event.target.value)}
              >
                <option value="">Select a rating</option>
                <option value="Excellent">Excellent</option>
                <option value="Meets Expectations">Meets Expectations</option>
                <option value="Needs Improvement">Needs Improvement</option>
              </select>
            </label>
          )}

          <label>
            <div>Share your Feedback <span className="custom-required" aria-hidden="true">*</span></div>
            <textarea className="custom-textarea" name="feedback" placeholder="Share your feedback with us" required rows={3} maxLength={5000} />
          </label>

          {/* <label>
            Store Owner Name
            <input name="storeOwnerName" placeholder="Enter the store owner name" defaultValue={storeOwnerName} maxLength={200} />
          </label>

          <label>
            Store Owner Email
            <input name="storeOwnerEmail" type="email" placeholder="name@example.com" defaultValue={storeOwnerEmail} maxLength={320} />
          </label> */}

          <button className="custom-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Submit Feedback"}
          </button>
        </Form>
      </section>
    </main>
  );
}
