import { useState, useEffect, ChangeEvent } from "react";
import { Form, useLoaderData, redirect } from "react-router";
import "app/style/checklist.css";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import {
  savePermissions,
  getPermissions,
} from "app/utils/dbPermissionStorage.server";
import { updateShopOwner } from "app/utils/dbShopStorage.server";
import GreetingPage from "app/Component/greeting";

type PermissionKey =
  | "orders"
  | "products"
  | "customers"
  | "marketing"
  | "finance"
  | "analytics";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);

  const shop = session.shop;

  const response = await admin.graphql(`
  query {
    shop {
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

  const json = await response.json();
  const s = json.data.shop;

  console.log("SHop data : ", s);

  updateShopOwner(shop, {
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

  const existing = getPermissions(shop);
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

  return redirect("/app/greeting");
}

export default function EnhancedChecklist() {
  const permission = useLoaderData();

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

  const canProceed = allChecked && termsAccepted;

  const OPTIONS: { key: PermissionKey; label: string }[] = [
    { key: "orders", label: "Orders" },
    { key: "products", label: "Products" },
    { key: "customers", label: "Customers" },
    { key: "marketing", label: "Marketing" },
    { key: "finance", label: "Finance" },
    { key: "analytics", label: "Analytics" },
  ];

  if (permission?.termsAccepted === true) {
    return <GreetingPage/>
  } else {
    return (
      <div className="page-wrapper">
        <div className="logo">
          <img src="/logo.png" alt="Company Logo" />
        </div>

        <div className="intro">
          <h3>Company Title this is my testing text</h3>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum
            dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit
            amet consectetur adipisicing elit. Lorem ipsum dolor sit amet
            consectetur adipisicing elit.{" "}
          </p>
        </div>

        <Form method="post" replace>
          <input
            type="hidden"
            name="permissions"
            value={JSON.stringify(checks)}
          />
          <input
            type="hidden"
            name="termsAccepted"
            value={String(termsAccepted)}
          />

          <div className="card">
            <label className="sellectall">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className="checkbox-label">Select all</span>
              <span className="checkbox-checkmark" />
            </label>

            <div className="divider" />

            {OPTIONS.map((option) => (
              <label key={option.key} className="checkbox">
                <input
                  type="checkbox"
                  checked={checks[option.key]}
                  onChange={handleChange(option.key)}
                />
                <span className="checkbox-label">{option.label}</span>
                <span className="checkbox-checkmark" />
              </label>
            ))}
          </div>

          <div className="terms">
            <label className="terms-check">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span className="checkbox-label">
                I agree to the{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() =>
                    window.open("https://adbuffs.com/privacy-policy/", "_blank")
                  }
                >
                  Terms & Policy
                </button>
              </span>
              <span className="checkbox-checkmark" />
            </label>
          </div>

          <div className="actions">
            <button
              type="submit"
              className="next-button"
              disabled={!canProceed}
            >
              Authorized, Continue
            </button>
          </div>
        </Form>
      </div>
    );
  }
}
