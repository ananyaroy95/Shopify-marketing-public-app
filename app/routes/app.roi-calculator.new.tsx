import { Link, data, redirect, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { getPermissions } from "app/utils/dbPermissionStorage.server";
import RoiCrudForm from "app/Component/RoiCrudForm";
import { createRoi, readRoiInput, validateRoi } from "app/utils/roi.server";
import type { RoiErrors, RoiInput } from "app/utils/roi.server";

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
  const input = readRoiInput(await request.formData());
  const errors = validateRoi(input);
  if (Object.keys(errors).length) return data({ errors, values: input }, { status: 400 });
  try {
    await createRoi(session.shop, input);
    return redirect("/app/roi-calculator?message=created");
  } catch (error) {
    console.error("Failed to create ROI calculation:", error);
    return data({ errors: { spends: "Unable to save this calculation right now." }, values: input }, { status: 500 });
  }
}

type ActionData = { errors?: RoiErrors; values?: RoiInput };

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
          heading={
            <>
              <p className="custom-eyebrow">Adbuffs Onboard</p>
              <h1 className="custom-title">Add ROI Calculation</h1>
              <p className="custom-intro">Enter the monthly metrics, then view the calculation before saving it for this store.</p>
            </>
          }
        />
      </section>
    </main>
  );
}
