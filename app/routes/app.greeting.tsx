import { redirect, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions, markGreetingShown } from "app/utils/dbPermissionStorage.server";
import { sendSummaryEmail } from "app/utils/email.server";
import { readFeedbackAnswers, readRoiAnswers } from "app/utils/onboardingAnswersCookie.server";
import { getStoreOwnerEmail } from "app/utils/storeOwnerEmail.server";
import GreetingPage from "app/Component/greeting";
import { loadDashboard } from "app/utils/dashboard.server";
import { logAdminAccessDiagnostics } from "app/utils/accessDiagnostics.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const existing = await getPermissions(shop);

  // The checklist has to be finished before this screen. The summary email
  // still goes out only the first time, so a later Next click can open the
  // congratulations page without waiting on mail again.
  if (!existing?.termsAccepted) {
    return redirect("/app");
  }

  // Temporary diagnostics — remove once the 403 is fixed.
  await logAdminAccessDiagnostics(admin, {
    shop,
    sessionScope: session.scope,
    hasRefreshToken: Boolean(session.refreshToken),
    expires: session.expires ?? null,
  });

  if (!existing.greetingShown) {
    const feedback = readFeedbackAnswers(request);
    const roi = readRoiAnswers(request);
    await markGreetingShown(shop);
    void sendGreetingSummary(admin, shop, existing.permissions, existing.termsAccepted, feedback, roi);
  }

  return { dashboard: await loadDashboard(admin) };
}

async function sendGreetingSummary(
  admin: Parameters<typeof getStoreOwnerEmail>[0],
  shop: string,
  permissions: Parameters<typeof sendSummaryEmail>[2],
  termsAccepted: boolean,
  feedback: ReturnType<typeof readFeedbackAnswers>,
  roi: ReturnType<typeof readRoiAnswers>,
) {
  try {
    const storeOwnerEmail = await getStoreOwnerEmail(admin, "Greeting");
    await sendSummaryEmail(shop, storeOwnerEmail, permissions, termsAccepted, feedback, roi);
  } catch (error) {
    console.error("Greeting summary email failed (non-fatal):", error);
  }
}

export default function Greeting() {
  const { dashboard } = useLoaderData<typeof loader>();
  return <GreetingPage dashboard={dashboard} />;
}
