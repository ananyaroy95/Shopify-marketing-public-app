import { Outlet, data } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import { sendRoiResultEmail } from "app/utils/email.server";
import { withRoiAnswersCookie } from "app/utils/onboardingAnswersCookie.server";
import { getStoreOwnerEmail } from "app/utils/storeOwnerEmail.server";
import { ROI_PERIODS, calculateRoi, readRoiInput } from "app/utils/roi.server";
import type { RoiPeriod } from "app/utils/roi.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const existing = await getPermissions(session.shop);
  if (existing?.termsAccepted !== true) {
    throw new Response(null, { status: 302, headers: { Location: "/app" } });
  }
  return null;
}

type RoiActionResult = {
  result?: { periodDays: number; roi: number; costPerOrder: number; ncac: number; costPerSession: number };
  error?: string;
};

// The onboarding popup posts here without ?index. Saved ROI records use the
// child routes, so this action stays the calculator email step.
export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const input = readRoiInput(await request.formData());
  const monthlyValues = [input.grossSales, input.orders, input.newCustomers, input.totalSessions, input.spends];

  if (monthlyValues.some((value) => !Number.isFinite(value)) || !ROI_PERIODS.includes(input.periodDays as RoiPeriod)) {
    return data<RoiActionResult>({ error: "Please enter all five monthly fields." });
  }

  const result = { periodDays: input.periodDays, ...calculateRoi(input) };
  const storeOwnerEmail = await getStoreOwnerEmail(admin, "ROI calculator");
  const answers = { ...input, ...result };
  await sendRoiResultEmail(session.shop, storeOwnerEmail, answers);

  return data<RoiActionResult>({ result }, { headers: { "Set-Cookie": withRoiAnswersCookie(answers) } });
}

export default function RoiLayout() {
  return <Outlet />;
}
