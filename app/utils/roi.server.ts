import prisma from "./prisma.server";
import { calculateRoi, withOptionalDefaults } from "./roi";
import type { RoiInput } from "./roi";

export type { RoiErrors, RoiInput, RoiMetrics, RoiPeriod } from "./roi";
export { ROI_PERIODS, calculateRoi, readRoiInput, round2, validateRoi } from "./roi";

function toData(shop: string, input: RoiInput) {
  const values = withOptionalDefaults(input);
  return { shop, ...values, ...calculateRoi(values) };
}

export function listRoi(shop: string) {
  return prisma.roiCalculation.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

export function getRoi(shop: string, id: string) {
  return prisma.roiCalculation.findFirst({ where: { id, shop } });
}

export function createRoi(shop: string, input: RoiInput) {
  return prisma.roiCalculation.create({ data: toData(shop, input) });
}

export function updateRoi(shop: string, id: string, input: RoiInput) {
  const { shop: shopDomain, ...values } = toData(shop, input);
  return prisma.roiCalculation.updateMany({ where: { id, shop: shopDomain }, data: values });
}

export function deleteRoi(shop: string, id: string) {
  return prisma.roiCalculation.deleteMany({ where: { id, shop } });
}
