// Carries Feedback and ROI answers across the onboarding wizard's pages so the
// final "Congratulations" step can email the store owner one combined summary.
// This is intentionally NOT written to the database or any server-side store —
// per the client's requirement, it lives only in the merchant's browser as a
// short-lived cookie, and is only ever read back once, at the Greeting step.

const FEEDBACK_COOKIE = "adbuffs_feedback_answers";
const ROI_COOKIE = "adbuffs_roi_answers";
// Long enough to finish the wizard in one sitting, short enough not to linger
// in the browser afterwards.
const MAX_AGE_SECONDS = 60 * 60;

export type FeedbackAnswers = {
  companyName: string;
  brandName: string;
  websiteUrl: string;
  discoverySource: string;
  associationStatus: string;
  experienceRating: string;
  feedback: string;
};

export type RoiAnswers = {
  periodDays: number;
  grossSales: number;
  orders: number;
  newCustomers: number;
  totalSessions: number;
  spends: number;
  roi: number;
  costPerOrder: number;
  ncac: number;
  costPerSession: number;
};

function encode(value: unknown) {
  return encodeURIComponent(JSON.stringify(value));
}

function decode<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return null;
  }
}

function cookieHeader(name: string, value: string) {
  // SameSite=None + Secure is required for cookies to survive inside Shopify's
  // embedded admin iframe.
  return `${name}=${value}; Path=/app; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=None`;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("Cookie") ?? "";
  const prefix = `${name}=`;
  const match = header.split(/;\s*/).find((part) => part.startsWith(prefix));
  return match?.slice(prefix.length);
}

export function withFeedbackAnswersCookie(answers: FeedbackAnswers) {
  return cookieHeader(FEEDBACK_COOKIE, encode(answers));
}

export function readFeedbackAnswers(request: Request) {
  return decode<FeedbackAnswers>(readCookie(request, FEEDBACK_COOKIE));
}

export function withRoiAnswersCookie(answers: RoiAnswers) {
  return cookieHeader(ROI_COOKIE, encode(answers));
}

export function readRoiAnswers(request: Request) {
  return decode<RoiAnswers>(readCookie(request, ROI_COOKIE));
}
