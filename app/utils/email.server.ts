import nodemailer from "nodemailer";
import type { PermissionKey } from "app/utils/dbPermissionStorage.server";
import type { FeedbackAnswers, RoiAnswers } from "app/utils/onboardingAnswersCookie.server";

// Outgoing email for the onboarding wizard. SMTP details are read from env
// vars (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
// EMAIL_FROM_ADDRESS, APP_OWNER_EMAIL). The client hasn't shared their real
// SMTP details yet — fill these in with your own test account (e.g. Gmail
// with an app password, or Mailtrap) in .env, and swap them for the client's
// values later. Nothing here is required for the app to boot: if SMTP isn't
// configured, sends are skipped and logged rather than throwing.
let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  cachedTransport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
  return cachedTransport;
}

// Email delivery is best-effort and must never block the onboarding flow —
// every call site awaits this, but a failure here is only ever logged.
async function sendMail(to: string, subject: string, html: string) {
  if (!to) {
    console.error(`Email "${subject}" was not sent: no recipient address available.`);
    return;
  }

  const transport = getTransport();
  if (!transport) {
    console.warn(
      `Email "${subject}" to ${to} was not sent: SMTP is not configured. ` +
        `Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in .env.`,
    );
    return;
  }

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error(`Failed to send email "${subject}" to ${to}:`, error);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

function rowHtml(label: string, htmlValue: string) {
  const labelCell = "padding:10px 14px;border:1px solid #e1e3e5;background:#f6f6f7;color:#6d7175;font-weight:700;width:220px;vertical-align:middle;";
  const valueCell = "padding:10px 14px;border:1px solid #e1e3e5;color:#202223;vertical-align:middle;line-height:1.45;";
  return `<tr><td style="${labelCell}">${escapeHtml(label)}</td><td style="${valueCell}">${htmlValue || "—"}</td></tr>`;
}

function row(label: string, value: string) {
  return rowHtml(label, escapeHtml(value).replace(/\n/g, "<br>") || "—");
}

function linkValue(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "—";
  const safe = escapeHtml(trimmed);
  return `<a href="${safe}" style="color:#2c6ecb;text-decoration:underline;">${safe}</a>`;
}

function table(rows: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:640px;font-family:Arial,sans-serif;font-size:14px;">${rows}</table>`;
}

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  orders: "Orders",
  products: "Products",
  customers: "Customers",
  marketing: "Marketing",
  finance: "Finance",
  analytics: "Analytics",
};

function permissionsGranted(permissions: Record<PermissionKey, boolean>) {
  const granted = (Object.keys(PERMISSION_LABELS) as PermissionKey[]).filter((key) => permissions[key]);
  return granted.length ? granted.map((key) => PERMISSION_LABELS[key]).join(", ") : "None";
}

// Email #1 — sent to the App Owner right after the merchant authorizes the
// checklist (submits the "Authorized, Continue" form).
export async function sendOnboardPermissionEmail(
  shop: string,
  permissions: Record<PermissionKey, boolean>,
  termsAccepted: boolean,
) {
  const html = `
    <h2>New Adbuffs Onboard authorization</h2>
    ${table([
      row("Store", shop),
      row("Terms accepted", termsAccepted ? "Yes" : "No"),
      row("Permissions granted", permissionsGranted(permissions)),
    ].join(""))}
  `;
  await sendMail(process.env.APP_OWNER_EMAIL ?? "", `Adbuffs Onboard: ${shop} authorized the app`, html);
}

// Email #2 — sent to the App Owner when the Feedback form is actually
// submitted (never on Skip, since Skip doesn't hit this action).
export async function sendFeedbackEmail(shop: string, fields: FeedbackAnswers) {
  const fromName = fields.companyName.trim() || shop;
  const html = `
    <h2 style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:18px;color:#202223;">New feedback submitted from ${escapeHtml(fromName)}</h2>
    ${table([
      row("Store", shop),
      row("Company Name", fields.companyName),
      row("Brand Name", fields.brandName),
      rowHtml("Website URL", linkValue(fields.websiteUrl)),
      row("How they heard about us", fields.discoverySource),
      row("Associated with Adbuffs?", fields.associationStatus),
      row("Experience rating", fields.experienceRating),
      row("Feedback", fields.feedback),
    ].join(""))}
  `;
  await sendMail(process.env.APP_OWNER_EMAIL ?? "", `Adbuffs Onboard: Feedback from ${shop}`, html);
}

const ROI_RESULT_HEADING = "ROI calculated Result with above values";

function roiInputRows(roi: RoiAnswers) {
  return [
    row("Reporting period", `${roi.periodDays} days`),
    row("Gross Sales", roi.grossSales.toFixed(2)),
    row("Orders", String(roi.orders)),
    row("New Customers", String(roi.newCustomers)),
    row("Total Sessions", String(roi.totalSessions)),
    row("Spends", roi.spends.toFixed(2)),
  ].join("");
}

function roiMetricRows(roi: RoiAnswers) {
  return [
    row("ROI", roi.roi.toFixed(2)),
    row("Cost per Order", roi.costPerOrder.toFixed(2)),
    row("New Customer Acquisition Cost", roi.ncac.toFixed(2)),
    row("Cost per Session", roi.costPerSession.toFixed(2)),
  ].join("");
}

function roiResultHeading() {
  return `<h3 style="margin:20px 0 12px;font-family:Arial,sans-serif;font-size:16px;color:#202223;">${ROI_RESULT_HEADING}</h3>`;
}

// Email #3 — sent to the Store Owner when the ROI Calculator form is actually
// submitted (never on Skip).
export async function sendRoiResultEmail(shop: string, storeOwnerEmail: string, roi: RoiAnswers) {
  const html = `
    <h2 style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:18px;color:#202223;">Your Adbuffs ROI results</h2>
    ${table(`${row("Store", shop)}${roiInputRows(roi)}`)}
    ${roiResultHeading()}
    ${table(roiMetricRows(roi))}
  `;
  await sendMail(storeOwnerEmail, "Your Adbuffs Onboard ROI results", html);
}

// Email #4 — sent once to the Store Owner at the Congratulations screen,
// combining the onboarding permissions with whichever of Feedback/ROI were
// actually submitted (skipped steps are simply left out).
export async function sendSummaryEmail(
  shop: string,
  storeOwnerEmail: string,
  permissions: Record<PermissionKey, boolean>,
  termsAccepted: boolean,
  feedback: FeedbackAnswers | null,
  roi: RoiAnswers | null,
) {
  const sections = [
    `<h2>Your Adbuffs Onboard summary</h2>`,
    table([
      row("Store", shop),
      row("Terms accepted", termsAccepted ? "Yes" : "No"),
      row("Permissions granted", permissionsGranted(permissions)),
    ].join("")),
  ];

  if (feedback) {
    sections.push(`<h3>Feedback</h3>`);
    sections.push(
      table(
        [
          row("Company Name", feedback.companyName),
          row("Brand Name", feedback.brandName),
          rowHtml("Website URL", linkValue(feedback.websiteUrl)),
          row("How they heard about us", feedback.discoverySource),
          row("Associated with Adbuffs?", feedback.associationStatus),
          row("Experience rating", feedback.experienceRating),
          row("Feedback", feedback.feedback),
        ].join(""),
      ),
    );
  }

  if (roi) {
    sections.push(`<h3 style="margin:20px 0 12px;font-family:Arial,sans-serif;font-size:16px;color:#202223;">ROI Calculator</h3>`);
    sections.push(table(roiInputRows(roi)));
    sections.push(roiResultHeading());
    sections.push(table(roiMetricRows(roi)));
  }

  await sendMail(storeOwnerEmail, "Your Adbuffs Onboard summary", sections.join(""));
}
