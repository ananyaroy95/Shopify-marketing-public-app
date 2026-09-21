// Tracks Feedback/ROI wizard progress for the duration of onboarding only,
// via a short-lived cookie — intentionally NOT persisted to the database.

const COOKIE_NAME = "adbuffs_onboarding";
const MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day — enough to finish onboarding in one sitting.

export type OnboardingProgress = {
  feedbackSubmitted: boolean;
  roiViewed: boolean;
};

export function readOnboardingProgress(request: Request): OnboardingProgress {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const steps = match ? decodeURIComponent(match[1]).split(",") : [];

  return {
    feedbackSubmitted: steps.includes("feedback"),
    roiViewed: steps.includes("roi"),
  };
}

// Returns a Set-Cookie header value marking `step` complete, preserving any
// step already recorded on the incoming request's cookie.
export function withOnboardingStep(request: Request, step: "feedback" | "roi"): string {
  const progress = readOnboardingProgress(request);
  const steps = new Set<string>();
  if (progress.feedbackSubmitted || step === "feedback") steps.add("feedback");
  if (progress.roiViewed || step === "roi") steps.add("roi");

  const value = encodeURIComponent(Array.from(steps).join(","));
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=None; Secure; HttpOnly`;
}
