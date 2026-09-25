import { Link, data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import FeedbackCrudForm from "app/Component/FeedbackCrudForm";
import { getFeedback, readFeedbackInput, updateFeedback, validateFeedback } from "app/utils/feedback.server";
import type { FeedbackInput, FeedbackErrors } from "app/utils/feedback.server";

async function authorize(request: Request) {
  const auth = await authenticate.admin(request);
  const permissions = await getPermissions(auth.session.shop);
  if (permissions?.termsAccepted !== true) throw redirect("/app");
  return auth;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authorize(request);
  const record = params.id ? await getFeedback(session.shop, params.id) : null;
  if (!record) throw data({ message: "Feedback not found." }, { status: 404 });
  return { record };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authorize(request);
  if (!params.id) throw data({ message: "Feedback not found." }, { status: 404 });
  const input = readFeedbackInput(await request.formData());
  const errors = validateFeedback(input);
  if (Object.keys(errors).length) return data({ errors, values: input }, { status: 400 });
  try {
    const result = await updateFeedback(session.shop, params.id, input);
    if (!result.count) throw data({ message: "Feedback not found." }, { status: 404 });
    return redirect("/app/feedback?message=updated");
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Failed to update feedback:", error);
    return data({ errors: { feedback: "Unable to update feedback right now." }, values: input }, { status: 500 });
  }
}

type ActionData = { errors?: FeedbackErrors; values?: FeedbackInput };

export default function EditFeedback() {
  const { record } = useLoaderData<typeof loader>();
  const result = useActionData<ActionData>();
  const navigation = useNavigation();
  const values = result?.values ?? { companyName: record.companyName, brandName: record.brandName ?? "", websiteUrl: record.websiteUrl ?? "", howDidYouHear: record.howDidYouHear ?? "", associatedWithAdbuffs: record.associatedWithAdbuffs ?? "", experienceRating: "", feedback: record.feedback };
  return <main className="custom-page"><section className="custom-panel feedback-panel"><Link className="wizard-back" to={`/app/feedback/${record.id}`}>← Back to Feedback Details</Link><p className="custom-eyebrow">Adbuffs Onboard</p><h1 className="custom-title">Edit Feedback</h1><p className="custom-intro">Update this feedback record.</p><FeedbackCrudForm mode="edit" values={values} errors={result?.errors} submitting={navigation.state !== "idle"} /></section></main>;
}
