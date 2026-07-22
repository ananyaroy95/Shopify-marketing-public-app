import { useState, useEffect, ChangeEvent } from "react";
import { Form, useLoaderData, redirect, useSearchParams } from "react-router";
import "app/style/checklist.css";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { savePermissions, getPermissions } from "app/utils/dbPermissionStorage.server";
import { updateShopOwner } from "app/utils/dbShopStorage.server";
import GreetingPage from "app/Component/greeting";

type PermissionKey = | "orders" | "products" | "customers" | "marketing" | "finance" | "analytics";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  console.log("Shop:", session.shop);

  const shop = session.shop;

  // Owner info requires Protected Customer Data access. This is a best-effort
  // side-effect (persisted for later use) — it must never block the checklist
  // from rendering, so failures here are logged and swallowed, not thrown.
  try {
    const response = await admin.graphql(`
      query {
        shop {
          name
          shopOwnerName
          email
          billingAddress {
            phone
            address1
            city
            province
            country
            zip
          }
        }
      }
    `);

    const json: any = await response.json();

    if (json.errors) {
      throw new Error(`GraphQL query failed: ${JSON.stringify(json.errors)}`);
    }

    const s = json.data?.shop;
    if (!s) {
      throw new Error("Shop data not returned.");
    }

    await updateShopOwner(shop, {
      name: s.shopOwnerName,
      email: s.email,
      phone: s.billingAddress?.phone,
      address: s.billingAddress
        ? {
            address1: s.billingAddress.address1,
            city: s.billingAddress.city,
            province: s.billingAddress.province,
            country: s.billingAddress.country,
            zip: s.billingAddress.zip,
          }
        : undefined,
    });
  } catch (ownerError) {
    console.error("Failed to fetch/update shop owner info (non-fatal):");
    console.error(
      ownerError instanceof Response
        ? `HTTP ${ownerError.status} ${await ownerError.text().catch(() => "")}`
        : ownerError,
    );
  }

  const existing = await getPermissions(shop);
  console.log("Permissions:", existing);

  return existing;
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const permissions = JSON.parse(formData.get("permissions") as string);
  const termsAccepted = formData.get("termsAccepted") === "true";

  await savePermissions(shop, {
    permissions,
    termsAccepted,
    updatedAt: new Date().toISOString(),
  });

  return redirect("/app");
}

export default function EnhancedChecklist() {
  const permission = useLoaderData();
  const [searchParams] = useSearchParams();
  const reset = searchParams.get("reset") === "true";
  const [checks, setChecks] = useState<Record<PermissionKey, boolean>>({
    orders: false,
    products: false,
    customers: false,
    marketing: false,
    finance: false,
    analytics: false,
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [allChecked, setAllChecked] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    setAllChecked(Object.values(checks).every(Boolean));
  }, [checks]);

  const handleChange =
    (key: PermissionKey) => (e: ChangeEvent<HTMLInputElement>) => {
      setChecks((prev) => ({
        ...prev,
        [key]: e.target.checked,
      }));
    };
  const handleSelectAll = (checked: boolean) => {
    setChecks({
      orders: checked,
      products: checked,
      customers: checked,
      marketing: checked,
      finance: checked,
      analytics: checked,
    });
  };
  // const canProceed = allChecked && termsAccepted;
  const canProceed = termsAccepted;
  const OPTIONS: { key: PermissionKey; label: string }[] = [
    { key: "orders", label: "Orders" },
    { key: "products", label: "Products" },
    { key: "customers", label: "Customers" },
    { key: "marketing", label: "Marketing" },
    { key: "finance", label: "Finance" },
    { key: "analytics", label: "Analytics" },
  ];

  if (permission?.termsAccepted === true && !reset) {
    return <GreetingPage />;
  } else {
    return (
      <div className="page-wrapper">
        <div className="page_form_content">
          <div className="logo">
            <img src="/logo.png" alt="Company Logo" />
          </div>

          <div className="intro">
            <h3>Welcome to The Adbuffs Onboarding App</h3>
            <p>By installing Adbuffs Onboard, you consent to the app accessing necessary data from your Shopify store, including, but not limited to, marketing information, customer details, order data, product information, and analytics.</p>
            <p>This data is used only to operate the app and optimize your marketing campaigns. It is not shared with third parties for unrelated purposes.</p>
            <p>Plug the app into your store and keep track of customer approvals, spot useful trends, and make better marketing decisions along the way. Everything runs securely in the background while you focus on growing your store.</p>
            <ul className="text-li">
              <li> <img src="/check_circle.png" alt="check circle icon" /> Easy Consent Management</li>
              <li> <img src="/check_circle.png" alt="check circle icon" /> Smarter Campaign Insights</li>
              <li> <img src="/check_circle.png" alt="check circle icon" /> Secure & Privacy Friendly</li>
              <li> <img src="/check_circle.png" alt="check circle icon" /> Quick & Simple Setup</li>
            </ul>
          </div>

          <Form method="post" replace>
            <input type="hidden" name="permissions" value={JSON.stringify(checks)} />
            <input type="hidden" name="termsAccepted" value={String(termsAccepted)} />

            <div className="card">
              <label className="sellectall">
                <input type="checkbox" checked={allChecked} onChange={(e) => handleSelectAll(e.target.checked)} />
                <span className="checkbox-label">Select all</span>
                <span className="checkbox-checkmark" />
              </label>

              <div className="divider" />

              {OPTIONS.map((option) => (
                <label key={option.key} className="checkbox">
                  <input type="checkbox" checked={checks[option.key]} onChange={handleChange(option.key)} />
                  <span className="checkbox-label">{option.label}</span>
                  <span className="checkbox-checkmark" />
                </label>
              ))}
            </div>

            <div className="terms">
              <label className="terms-check">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                <span className="checkbox-label">
                  I agree to the {" "}
                  <button type="button" className="link-button" onClick={() => window.open("https://adbuffs.com/privacy-policy/", "_blank")}> Terms & Policy </button>
                </span>
                <span className="checkbox-checkmark" />
              </label>
            </div>

            <div className="actions">
              <button type="submit" className="next-button" disabled={!canProceed}> Authorized, Continue </button>
            </div>
          </Form>
          
          <div className="footer-note">
            <p>Everyone please note that the name of the proposed app shall be "<b>Adbuffs Onboard</b>" for all purposes and assigns.</p>
            <p>
              <b>Disclaimer:</b>
              <i>
                This application is available exclusively to merchants availing services from "<b>Adbuffs Media Private Limited</b>".
                {!showMore && (
                  <i className="viewMoreBtn" role="button" onClick={() => setShowMore(true)}>View More</i>
                )}
              </i>
            </p>

            {showMore && (
              <p className="more_content">Connect your Shopify store with <b>Adbuffs On-Board</b> to securely manage consent records, support DPDP-compliant marketing activities, and unlock valuable insights that help optimize your campaigns. Designed to work seamlessly in the background, the application lets you focus on growing your business while we help keep your marketing operations compliant and efficient.
                <i className="viewLessBtn" role="button" onClick={() => setShowMore(false)}>View Less</i>
              </p>
            )}

            {/* <strong>Please note:</strong> This app is intended only for merchants using services from Adbuffs Media Private Limited. */}
          </div>
        </div>
      </div>
    );
  }
}
