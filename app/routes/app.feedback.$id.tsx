import { data, redirect, Outlet } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import { deleteFeedback, getFeedback } from "app/utils/feedback.server";

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
  const result = await deleteFeedback(session.shop, params.id);
  if (!result.count) throw data({ message: "Feedback not found." }, { status: 404 });
  return redirect("/app/feedback?message=deleted");
}

export default function FeedbackRecordLayout() {
  return <Outlet />;
}
