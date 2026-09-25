import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useFetcher, useLoaderData, useNavigate, useNavigation, useSearchParams } from "react-router";
import GreetingPage from "app/Component/greeting";
import FeedbackFields from "app/Component/FeedbackFields";
import RoiFields from "app/Component/RoiFields";
import { formatNumber } from "app/utils/formatNumber";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { savePermissions, getPermissions } from "app/utils/dbPermissionStorage.server";
import { updateShopOwner } from "app/utils/dbShopStorage.server";
import { sendOnboardPermissionEmail } from "app/utils/email.server";
import { loadDashboard } from "app/utils/dashboard.server";
import { logAdminAccessDiagnostics } from "app/utils/accessDiagnostics.server";

type RoiResult = {
  periodDays: number;
  roi: number;
  costPerOrder: number;
  ncac: number;
  costPerSession: number;
};

type PermissionKey = | "orders" | "products" | "customers" | "marketing" | "finance" | "analytics";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  console.log("Shop:", session.shop);

  const shop = session.shop;

  // Temporary: log real Shopify-granted scopes and probe each Admin call alone.
  // Remove app/utils/accessDiagnostics.server.ts once the 403 is fixed.
  await logAdminAccessDiagnostics(admin, {
    shop,
    sessionScope: session.scope,
    hasRefreshToken: Boolean(session.refreshToken),
    expires: session.expires ?? null,
  });

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
    console.log("[access-diag] shop-owner update: OK");
  } catch (ownerError) {
    console.error("Failed to fetch/update shop owner info (non-fatal):");
    console.error(
      ownerError instanceof Response
        ? `HTTP ${ownerError.status} ${await ownerError.text().catch(() => "")}`
        : ownerError,
    );
  }

  const existing = await getPermissions(shop);
  console.log("Permissions (app checklist only, not Shopify scopes):", existing);
  const dashboard = existing?.termsAccepted === true ? await loadDashboard(admin) : null;

  return existing ? { ...existing, dashboard } : { dashboard };
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

  // Email #1: notify the App Owner as soon as permissions are granted.
  await sendOnboardPermissionEmail(shop, permissions, termsAccepted);

  // No redirect here: the page opens the feedback popup once this succeeds.
  return { saved: true };
}

export default function EnhancedChecklist() {
  const permission = useLoaderData();
  const [searchParams] = useSearchParams();
  const fetcher = useFetcher<typeof action>();
  const feedbackFetcher = useFetcher<{ success: boolean; error?: string }>();
  const roiFetcher = useFetcher<{ result?: RoiResult; error?: string }>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isContinuing = navigation.state !== "idle";
  // The popup covers both steps: Feedback first, then ROI — matching the
  // client's flow, with no page navigation until it hands off to Congratulations.
  const [popupPhase, setPopupPhase] = useState<"feedback" | "roi">("feedback");
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // Once the permissions are saved the loader reports termsAccepted, so the popup
  // must be tracked separately or the "Setup Completed" view would replace it.
  const showFeedbackPrompt = fetcher.data?.saved === true;
  const isSaving = fetcher.state !== "idle";
  const isSendingFeedback = feedbackFetcher.state !== "idle";
  const isCalculatingRoi = roiFetcher.state !== "idle";
  const roiResult = roiFetcher.data?.result;

  useEffect(() => {
    setAllChecked(Object.values(checks).every(Boolean));
  }, [checks]);

  // If the merchant doesn't click "Next" off the Feedback thank-you screen,
  // move on to the ROI step automatically after a few seconds.
  useEffect(() => {
    if (popupPhase === "feedback" && feedbackFetcher.data?.success) {
      advanceTimeoutRef.current = setTimeout(() => setPopupPhase("roi"), 3000);
      return () => {
        if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      };
    }
  }, [popupPhase, feedbackFetcher.data?.success]);

  function goToRoiStep() {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    setPopupPhase("roi");
  }

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
  // Finance is the only voluntary/optional permission — every other checkbox,
  // plus Terms & Policy, must be checked before the merchant can proceed.
  const canProceed =
    checks.orders && checks.products && checks.customers && checks.marketing && checks.analytics && termsAccepted;
  const OPTIONS: { key: PermissionKey; label: string }[] = [
    { key: "orders", label: "Orders" },
    { key: "products", label: "Products" },
    { key: "customers", label: "Customers" },
    { key: "marketing", label: "Marketing" },
    { key: "finance", label: "Finance" },
    { key: "analytics", label: "Analytics" },
  ];

  // reset=true is an admin/testing escape hatch that always forces the form,
  // regardless of prior submission state.
  if (!reset && permission?.termsAccepted === true && !showFeedbackPrompt) {
    return <GreetingPage dashboard={permission.dashboard} />;
  }

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

        <fetcher.Form method="post">
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
            <button type="submit" className="next-button" disabled={!canProceed || isSaving}> Authorized, Continue </button>
          </div>
        </fetcher.Form>

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

      {showFeedbackPrompt && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="feedback-prompt-title">
          <div className="modal-card">
            {popupPhase === "feedback" ? (
              feedbackFetcher.data?.success ? (
                <>
                  <h2 id="feedback-prompt-title">Thank you for your Feedback</h2>
                  <p>Your feedback submitted successfully.</p>
                  <div className="modal-actions">
                    <button type="button" className="next-button" onClick={goToRoiStep}>Next</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 id="feedback-prompt-title">Share your Feedback</h2>
                  <p>Tell us about your experience. Your feedback helps us improve the service.</p>
                  {feedbackFetcher.data?.error && <p className="custom-error" role="alert">{feedbackFetcher.data.error}</p>}
                  <feedbackFetcher.Form method="post" action="/app/feedback" className="custom-form">
                    <FeedbackFields />
                    <div className="custom-actions">
                      <button className="custom-button" type="submit" disabled={isSendingFeedback}>
                        {isSendingFeedback ? "Sending..." : "Submit Feedback"}
                      </button>
                      <button type="button" className="custom-secondary" onClick={goToRoiStep}>Skip</button>
                    </div>
                  </feedbackFetcher.Form>
                </>
              )
            ) : (
              <>
                {/* <div className="wizard-nav">
                  <button type="button" className="wizard-back" onClick={() => setPopupPhase("feedback")}>← Back</button>
                </div> */}
                <h2 id="feedback-prompt-title">ROI Calculator</h2>
                {roiResult ? (
                  <>
                    <p>Estimated for the selected {roiResult.periodDays}-day period</p>
                    <div className="roi-result-card"><span>ROI</span><strong className={roiResult.roi < 1 ? "roi-negative" : "roi-positive"}>{formatNumber(roiResult.roi)}</strong></div>
                    <div className="roi-result-card"><span>Cost per Order</span><strong>{formatNumber(roiResult.costPerOrder)}</strong></div>
                    <div className="roi-result-card"><span>New Customer Acquisition Cost</span><strong>{formatNumber(roiResult.ncac)}</strong></div>
                    <div className="roi-result-card"><span>Cost per Session</span><strong>{formatNumber(roiResult.costPerSession)}</strong></div>
                    <div className="modal-actions">
                      <button type="button" className="next-button" disabled={isContinuing} onClick={() => navigate("/app/greeting")}>
                        {isContinuing ? "Continuing..." : "Next"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>Enter your monthly brand metrics to calculate campaign efficiency for a selected reporting period.</p>
                    {roiFetcher.data?.error && <p className="custom-error" role="alert">{roiFetcher.data.error}</p>}
                    <roiFetcher.Form method="post" action="/app/roi-calculator" className="custom-form">
                      <RoiFields />
                      <div className="custom-actions">
                        <button className="custom-button" type="submit" disabled={isCalculatingRoi}>
                          {isCalculatingRoi ? "Calculating…" : "Calculate ROI"}
                        </button>
                        <button type="button" className="custom-secondary" disabled={isContinuing} onClick={() => navigate("/app/greeting")}>
                          {isContinuing ? "Continuing..." : "Skip"}
                        </button>
                      </div>
                    </roiFetcher.Form>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
