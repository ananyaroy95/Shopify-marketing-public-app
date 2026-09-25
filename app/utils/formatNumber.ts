// Shared by the ROI Calculator page and the onboarding popup on /app, so both
// render results the same way.
export function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}
