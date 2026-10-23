import { Outlet, data, redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import { createFeedback, deleteFeedback, normalizeWebsiteUrl, readFeedbackInput, validateFeedback } from "app/utils/feedback.server";
import { sendFeedbackEmail, sendStoreOwnerFeedbackEmail } from "app/utils/email.server";
import { getStoreOwnerEmail } from "app/utils/storeOwnerEmail.server";
import { withFeedbackAnswersCookie } from "app/utils/onboardingAnswersCookie.server";

async function requireOnboarding(request: Request) {
  const auth = await authenticate.admin(request);
  const permissions = await getPermissions(auth.session.shop);
  if (permissions?.termsAccepted !== true) throw redirect("/app");
  return auth;
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireOnboarding(request);
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "popup");

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "");
    if (!id) return redirect("/app/feedback?message=delete-error");
    try {
      const result = await deleteFeedback(session.shop, id);
      return redirect(`/app/feedback?message=${result.count ? "deleted" : "delete-error"}`);
    } catch (error) {
      console.error("Failed to delete feedback:", error);
      return redirect("/app/feedback?message=delete-error");
    }
  }

  if (intent === "create") {
    const input = readFeedbackInput(formData);
    const errors = validateFeedback(input);
    if (Object.keys(errors).length) return data({ errors, values: input }, { status: 400 });
    try {
      await createFeedback(session.shop, input);
      const fields = {
        companyName: input.companyName,
        brandName: input.brandName,
        websiteUrl: input.websiteUrl,
        discoverySource: input.howDidYouHear,
        associationStatus: input.associatedWithAdbuffs,
        experienceRating: input.experienceRating,
        feedback: input.feedback,
      };
      await sendFeedbackEmail(session.shop, fields);
      const storeOwnerEmail = await getStoreOwnerEmail(admin, "Feedback submission");
      await sendStoreOwnerFeedbackEmail(session.shop, storeOwnerEmail, fields);
      return redirect("/app/feedback?message=created");
    } catch (error) {
      console.error("Failed to create feedback:", error);
      return data({ errors: { feedback: "Unable to add feedback right now." }, values: input }, { status: 500 });
    }
  }

  const fields = {
    companyName: String(formData.get("companyName") ?? "").trim(),
    brandName: String(formData.get("brandName") ?? "").trim(),
    websiteUrl: normalizeWebsiteUrl(String(formData.get("websiteUrl") ?? "")),
    discoverySource: String(formData.get("discoverySource") ?? "").trim(),
    associationStatus: String(formData.get("associationStatus") ?? "").trim(),
    experienceRating: String(formData.get("experienceRating") ?? "").trim(),
    feedback: String(formData.get("feedback") ?? "").trim(),
  };
  if (!fields.companyName || !fields.feedback) return data({ success: false, error: "Company Name and Share your Feedback are required." });
  if (fields.websiteUrl) {
    try { new URL(fields.websiteUrl); } catch { return data({ success: false, error: "Please enter a valid Website URL." }); }
  }
  await sendFeedbackEmail(session.shop, fields);
  const storeOwnerEmail = await getStoreOwnerEmail(admin, "Feedback submission");
  await sendStoreOwnerFeedbackEmail(session.shop, storeOwnerEmail, fields);
  return data({ success: true }, { headers: { "Set-Cookie": withFeedbackAnswersCookie(fields) } });
}

export default function FeedbackLayout() {
  return <Outlet />;
}
