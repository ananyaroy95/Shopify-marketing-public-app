import { Link, data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import RoiCrudForm from "app/Component/RoiCrudForm";
import { getRoi, readRoiInput, updateRoi, validateRoi } from "app/utils/roi.server";
import type { RoiErrors, RoiInput } from "app/utils/roi.server";

async function authorize(request: Request) {
  const auth = await authenticate.admin(request);
  const permissions = await getPermissions(auth.session.shop);
  if (permissions?.termsAccepted !== true) throw redirect("/app");
  return auth;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authorize(request);
  const record = params.id ? await getRoi(session.shop, params.id) : null;
  if (!record) throw data({ message: "ROI calculation not found." }, { status: 404 });
  return { record };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authorize(request);
  if (!params.id) throw data({ message: "ROI calculation not found." }, { status: 404 });
  const input = readRoiInput(await request.formData());
  const errors = validateRoi(input);
  if (Object.keys(errors).length) return data({ errors, values: input }, { status: 400 });
  try {
    const result = await updateRoi(session.shop, params.id, input);
    if (!result.count) throw data({ message: "ROI calculation not found." }, { status: 404 });
    return redirect("/app/roi-calculator?message=updated");
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Failed to update ROI calculation:", error);
    return data({ errors: { spends: "Unable to update this calculation right now." }, values: input }, { status: 500 });
  }
}

type ActionData = { errors?: RoiErrors; values?: RoiInput };

export default function EditRoi() {
  const { record } = useLoaderData<typeof loader>();
  const result = useActionData<ActionData>();
  const navigation = useNavigation();
  const values = result?.values ?? {
    periodDays: record.periodDays,
    grossSales: record.grossSales,
    orders: record.orders,
    newCustomers: record.newCustomers,
    totalSessions: record.totalSessions,
    spends: record.spends,
  };
  return (
    <main className="custom-page">
      <section className="custom-panel feedback-panel roi-editor-panel">
        <Link className="wizard-back" to={`/app/roi-calculator/${record.id}`}>← Back to ROI Details</Link>
        <RoiCrudForm
          values={values}
          errors={result?.errors}
          submitting={navigation.state === "submitting"}
          cancelTo={`/app/roi-calculator/${record.id}`}
          heading={
            <>
              <p className="custom-eyebrow">Adbuffs Onboard</p>
              <h1 className="custom-title">Edit ROI Calculation</h1>
              <p className="custom-intro">Update the monthly metrics, then view the calculation before saving.</p>
            </>
          }
        />
      </section>
    </main>
  );
}
