import prisma from "./prisma.server";

export type PermissionKey =
  | "orders"
  | "products"
  | "customers"
  | "marketing"
  | "finance"
  | "analytics";

export type PermissionData = {
  permissions: Record<PermissionKey, boolean>;
  termsAccepted: boolean;
  updatedAt: string;
};

export async function savePermissions(shop: string, payload: PermissionData) {
  const shopRecord = await prisma.shop.findUnique({
    where: { shopDomain: shop },
    select: { id: true },
  });

  if (!shopRecord) {
    throw new Error(`Shop not found: ${shop}`);
  }

  await prisma.permission.upsert({
    where: { shopId: shopRecord.id },
    create: {
      shopId: shopRecord.id,
      orders: payload.permissions.orders,
      products: payload.permissions.products,
      customers: payload.permissions.customers,
      marketing: payload.permissions.marketing,
      finance: payload.permissions.finance,
      analytics: payload.permissions.analytics,
      termsAccepted: payload.termsAccepted,
    },
    update: {
      orders: payload.permissions.orders,
      products: payload.permissions.products,
      customers: payload.permissions.customers,
      marketing: payload.permissions.marketing,
      finance: payload.permissions.finance,
      analytics: payload.permissions.analytics,
      termsAccepted: payload.termsAccepted,
    },
  });
}

export async function getPermissions(shop: string) {
  const shopRecord = await prisma.shop.findUnique({
    where: { shopDomain: shop },
    select: { id: true },
  });

  if (!shopRecord) return null;

  const permission = await prisma.permission.findUnique({
    where: { shopId: shopRecord.id },
  });

  if (!permission) return null;

  return {
    permissions: {
      orders: permission.orders,
      products: permission.products,
      customers: permission.customers,
      marketing: permission.marketing,
      finance: permission.finance,
      analytics: permission.analytics,
    },
    termsAccepted: permission.termsAccepted,
    greetingShown: permission.greetingShown,
    updatedAt: permission.updatedAt.toISOString(),
  };
}

export async function markGreetingShown(shop: string) {
  const shopRecord = await prisma.shop.findUnique({
    where: { shopDomain: shop },
    select: { id: true },
  });

  if (!shopRecord) return;

  await prisma.permission.update({
    where: { shopId: shopRecord.id },
    data: { greetingShown: true },
  });
}

export async function deletePermissions(shop: string): Promise<boolean> {
  const shopRecord = await prisma.shop.findUnique({
    where: { shopDomain: shop },
    select: { id: true },
  });

  if (!shopRecord) return false;

  const result = await prisma.permission.deleteMany({
    where: { shopId: shopRecord.id },
  });

  return result.count > 0;
}
