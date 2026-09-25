import { useState } from "react";

// Shared by the /app/feedback page and the popup shown after authorization.
// Renders only the inputs; the parent supplies the <form> and its buttons.
export default function FeedbackFields() {
  const [associationStatus, setAssociationStatus] = useState("");
  const [experienceRating, setExperienceRating] = useState("");

  return (
    <>
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
    </>
  );
}
