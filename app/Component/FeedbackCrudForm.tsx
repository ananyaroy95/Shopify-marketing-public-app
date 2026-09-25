import { useEffect, useState } from "react";
import { Form, Link } from "react-router";
import type { FeedbackInput, FeedbackErrors } from "app/utils/feedback.server";

type Props = {
  mode: "create" | "edit";
  values?: FeedbackInput;
  errors?: FeedbackErrors;
  submitting?: boolean;
};

const emptyValues: FeedbackInput = {
  companyName: "",
  brandName: "",
  websiteUrl: "",
  howDidYouHear: "",
  associatedWithAdbuffs: "",
  experienceRating: "",
  feedback: "",
};

export default function FeedbackCrudForm({ mode, values = emptyValues, errors: serverErrors, submitting = false }: Props) {
  const [associatedWithAdbuffs, setAssociatedWithAdbuffs] = useState(values.associatedWithAdbuffs);
  const [experienceRating, setExperienceRating] = useState(values.experienceRating);
  const [fieldErrors, setFieldErrors] = useState<FeedbackErrors>(serverErrors ?? {});

  useEffect(() => {
    if (serverErrors) setFieldErrors(serverErrors);
  }, [serverErrors]);

  function clearError(name: keyof FeedbackErrors) {
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  return (
    <Form method="post" className="custom-form feedback-crud-form">
      <label>
        <span>Company Name <span className="custom-required" aria-hidden="true">*</span></span>
        <input className="custom-input" name="companyName" defaultValue={values.companyName} placeholder="Enter your company name" maxLength={200} aria-invalid={Boolean(fieldErrors.companyName)} onChange={() => clearError("companyName")} />
        {fieldErrors.companyName && <span className="field-error" role="alert">{fieldErrors.companyName}</span>}
      </label>
      <label>
        <span>Brand Name</span>
        <input className="custom-input" name="brandName" defaultValue={values.brandName} placeholder="Enter your brand name" maxLength={200} />
      </label>
      <label>
        <span>Website URL</span>
        <input className="custom-input" name="websiteUrl" type="url" defaultValue={values.websiteUrl} placeholder="https://example.com" maxLength={500} aria-invalid={Boolean(fieldErrors.websiteUrl)} onChange={() => clearError("websiteUrl")} />
        {fieldErrors.websiteUrl && <span className="field-error" role="alert">{fieldErrors.websiteUrl}</span>}
      </label>
      <label>
        <span>How did you come to know about us?</span>
        <textarea className="custom-textarea" name="howDidYouHear" defaultValue={values.howDidYouHear} placeholder="Tell us where you heard about Adbuffs" rows={3} maxLength={1000} />
      </label>
      <label>
        <span>Are you currently associated with Adbuffs?</span>
        <select
          className={`custom-select ${associatedWithAdbuffs ? "" : "custom-select-placeholder"}`}
          name="associatedWithAdbuffs"
          value={associatedWithAdbuffs}
          onChange={(event) => {
            const next = event.target.value;
            setAssociatedWithAdbuffs(next);
            if (next !== "Yes") setExperienceRating("");
          }}
        >
          <option value="">Select an option</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </label>
      {associatedWithAdbuffs === "Yes" && (
        <label>
          <span>Rate your experience</span>
          <select
            className={`custom-select ${experienceRating ? "" : "custom-select-placeholder"}`}
            name="experienceRating"
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
        <span>Share your Feedback <span className="custom-required" aria-hidden="true">*</span></span>
        <textarea className="custom-textarea" name="feedback" defaultValue={values.feedback} placeholder="Share your feedback with us" rows={6} maxLength={5000} aria-invalid={Boolean(fieldErrors.feedback)} onChange={() => clearError("feedback")} />
        {fieldErrors.feedback && <span className="field-error" role="alert">{fieldErrors.feedback}</span>}
      </label>
      <div className="feedback-actions">
        <button className="custom-button" type="submit" disabled={submitting}>{submitting ? (mode === "create" ? "Submitting..." : "Updating...") : (mode === "create" ? "Submit Feedback" : "Update Feedback")}</button>
        <Link className="custom-secondary" to="/app/feedback">Cancel</Link>
      </div>
    </Form>
  );
}
