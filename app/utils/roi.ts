export const ROI_PERIODS = [7, 14, 28] as const;

export type RoiPeriod = (typeof ROI_PERIODS)[number];

export type RoiInput = {
  periodDays: number;
  grossSales: number;
  orders: number;
  newCustomers: number;
  totalSessions: number;
  spends: number;
};

export type RoiMetrics = {
  roi: number;
  costPerOrder: number;
  ncac: number;
  costPerSession: number;
};

export type RoiErrors = Partial<Record<keyof RoiInput, string>>;

export function periodLabel(days: number) {
  return `Last ${days} days`;
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function readNumber(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function readRoiInput(formData: FormData): RoiInput {
  return {
    periodDays: Number(formData.get("periodDays")),
    grossSales: readNumber(formData, "grossSales") ?? Number.NaN,
    orders: readNumber(formData, "orders") ?? Number.NaN,
    newCustomers: readNumber(formData, "newCustomers") ?? Number.NaN,
    totalSessions: readNumber(formData, "totalSessions") ?? Number.NaN,
    spends: readNumber(formData, "spends") ?? Number.NaN,
  };
}

export function validateRoi(input: RoiInput): RoiErrors {
  const errors: RoiErrors = {};
  if (!ROI_PERIODS.includes(input.periodDays as RoiPeriod)) errors.periodDays = "Select a reporting period.";
  if (!Number.isFinite(input.spends)) errors.spends = "Enter a spends amount.";
  return errors;
}

function optionalAmount(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function withOptionalDefaults(input: RoiInput): RoiInput {
  return {
    ...input,
    grossSales: optionalAmount(input.grossSales),
    orders: optionalAmount(input.orders),
    newCustomers: optionalAmount(input.newCustomers),
    totalSessions: optionalAmount(input.totalSessions),
  };
}

export function calculateRoi(input: RoiInput): RoiMetrics {
  const values = withOptionalDefaults(input);
  const periodMultiplier = values.periodDays / 28;
  const salesForPeriod = values.grossSales * periodMultiplier;
  const ordersForPeriod = values.orders * periodMultiplier;
  const newCustomersForPeriod = values.newCustomers * periodMultiplier;
  const sessionsForPeriod = values.totalSessions * periodMultiplier;
  const spendForPeriod = values.spends * periodMultiplier;

  return {
    roi: round2(spendForPeriod > 0 ? salesForPeriod / spendForPeriod : 0),
    costPerOrder: round2(ordersForPeriod > 0 ? spendForPeriod / ordersForPeriod : 0),
    ncac: round2(newCustomersForPeriod > 0 ? spendForPeriod / newCustomersForPeriod : 0),
    costPerSession: round2(sessionsForPeriod > 0 ? spendForPeriod / sessionsForPeriod : 0),
  };
}
