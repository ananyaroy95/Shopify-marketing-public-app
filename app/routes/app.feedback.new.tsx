import { Link, data, redirect, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import FeedbackCrudForm from "app/Component/FeedbackCrudForm";
import { createFeedback, readFeedbackInput, validateFeedback } from "app/utils/feedback.server";
import type { FeedbackInput, FeedbackErrors } from "app/utils/feedback.server";

async function authorize(request: Request) {
  const auth = await authenticate.admin(request);
  const permissions = await getPermissions(auth.session.shop);
  if (permissions?.termsAccepted !== true) throw redirect("/app");
  return auth;
}

export async function loader({ request }: LoaderFunctionArgs) {
  await authorize(request);
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authorize(request);
  const input = readFeedbackInput(await request.formData());
  const errors = validateFeedback(input);
  if (Object.keys(errors).length) return data({ errors, values: input }, { status: 400 });
  try {
    await createFeedback(session.shop, input);
    return redirect("/app/feedback?message=created");
  } catch (error) {
    console.error("Failed to create feedback:", error);
    return data({ errors: { feedback: "Unable to add feedback right now." }, values: input }, { status: 500 });
  }
}

type ActionData = { errors?: FeedbackErrors; values?: FeedbackInput };

export default function NewFeedback() {
  const result = useActionData<ActionData>();
  const navigation = useNavigation();
  return <main className="custom-page"><section className="custom-panel feedback-panel"><Link className="wizard-back" to="/app/feedback">← Back to Feedback</Link><p className="custom-eyebrow">Adbuffs Onboard</p><h1 className="custom-title">Add Feedback</h1><p className="custom-intro">Capture feedback for this Shopify store.</p><FeedbackCrudForm mode="create" values={result?.values} errors={result?.errors} submitting={navigation.state !== "idle"} /></section></main>;
}
