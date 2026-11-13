import { Link, data, redirect, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import RoiCrudForm from "app/Component/RoiCrudForm";
import { calculateRoi, createRoi, readRoiInput, validateRoi } from "app/utils/roi.server";
import type { RoiErrors, RoiInput } from "app/utils/roi.server";
import { sendRoiResultEmail } from "app/utils/email.server";
import { getStoreOwnerEmail } from "app/utils/storeOwnerEmail.server";
import { getShopifyRoiMetrics } from "app/utils/shopifyRoiMetrics.server";
import { ROI_PERIODS } from "app/utils/roi";
import type { RoiPeriod } from "app/utils/roi";

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
  const { session, admin } = await authorize(request);
  const formData = await request.formData();
  if (formData.get("intent") === "fetchShopifyMetrics") {
    const periodDays = Number(formData.get("periodDays"));
    if (!ROI_PERIODS.includes(periodDays as RoiPeriod)) {
      return data<ActionData>({
        intent: "fetchShopifyMetrics",
        periodDays,
        fetchError: "Select a valid reporting period.",
      }, { status: 400 });
    }

    try {
      const metrics = await getShopifyRoiMetrics(admin, periodDays as RoiPeriod);
      return data<ActionData>({ intent: "fetchShopifyMetrics", periodDays, metrics });
    } catch (error) {
      console.error(`Failed to load Shopify ROI metrics for ${session.shop}:`, error);
      return data<ActionData>({
        intent: "fetchShopifyMetrics",
        periodDays,
        fetchError: "Could not load Shopify analytics. Confirm the app has read_reports and Shopify analytics access, then approve the updated permissions in the store.",
      }, { status: 502 });
    }
  }

  const input = readRoiInput(formData);
  const errors = validateRoi(input);
  for (const field of ["grossSales", "orders", "newCustomers", "totalSessions"] as const) {
    if (!Number.isFinite(input[field])) {
      errors[field] = "Load this value from Shopify or enter it manually.";
    }
  }
  if (Object.keys(errors).length) return data({ errors, values: input }, { status: 400 });
  try {
    await createRoi(session.shop, input);
    // Create only: notify Store Owner (same as previous onboarding ROI email).
    const metrics = calculateRoi(input);
    const storeOwnerEmail = await getStoreOwnerEmail(admin, "ROI calculator");
    await sendRoiResultEmail(session.shop, storeOwnerEmail, { ...input, ...metrics });
    return redirect("/app/roi-calculator?message=created");
  } catch (error) {
    console.error("Failed to create ROI calculation:", error);
    return data({ errors: { spends: "Unable to save this calculation right now." }, values: input }, { status: 500 });
  }
}

type ActionData = {
  intent?: "fetchShopifyMetrics";
  periodDays?: number;
  metrics?: {
    grossSales: number;
    orders: number;
    newCustomers: number;
    totalSessions: number;
  };
  fetchError?: string;
  errors?: RoiErrors;
  values?: RoiInput;
};

export default function NewRoi() {
  const result = useActionData<ActionData>();
  const navigation = useNavigation();
  return (
    <main className="custom-page">
      <section className="custom-panel feedback-panel roi-editor-panel">
        <Link className="wizard-back" to="/app/roi-calculator">← Back to ROI Calculation</Link>
        <RoiCrudForm
          values={result?.values}
          errors={result?.errors}
          submitting={navigation.state === "submitting"}
          cancelTo="/app/roi-calculator"
          autoFetchMetrics
          heading={
            <>
              <p className="custom-eyebrow">Adbuffs Onboard</p>
              <h1 className="custom-title">Add ROI Calculation</h1>
              <p className="custom-intro">Sales, orders, new customers, and sessions load from Shopify for the selected period. Enter your marketing spend, then view and save the calculation.</p>
            </>
          }
        />
      </section>
    </main>
  );
}
