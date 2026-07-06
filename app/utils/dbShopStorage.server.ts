import prisma from "./prisma.server";

export type ShopOwner = {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    address1?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
  };
};

type ShopRecord = {
  accessToken: string;
  installedAt: string;
  uninstalledAt?: string;
  owner?: ShopOwner;
};

export async function saveShop(shop: string, accessToken: string) {
  await prisma.shop.upsert({
    where: { shopDomain: shop },
    update: {
      accessToken,
      installedAt: new Date(),
      uninstalledAt: null,
    },
    create: {
      shopDomain: shop,
      accessToken,
      installedAt: new Date(),
    },
  });
}

export async function getInstalledShop(shop: string): Promise<ShopRecord | null> {
  const record = await prisma.shop.findUnique({
    where: { shopDomain: shop },
    select: {
      accessToken: true,
      installedAt: true,
      uninstalledAt: true,
      ownerName: true,
      ownerEmail: true,
      phone: true,
      address1: true,
      city: true,
      province: true,
      country: true,
      zip: true,
    },
  });

  if (!record || record.uninstalledAt) return null;

  return {
    accessToken: record.accessToken,
    installedAt: (record.installedAt as Date).toISOString(),
    uninstalledAt: record.uninstalledAt
      ? (record.uninstalledAt as Date).toISOString()
      : undefined,
    owner:
      record.ownerName || record.ownerEmail || record.phone || record.address1
        ? {
            name: record.ownerName ?? undefined,
            email: record.ownerEmail ?? undefined,
            phone: record.phone ?? undefined,
            address: record.address1
              ? {
                  address1: record.address1,
                  city: record.city ?? undefined,
                  province: record.province ?? undefined,
                  country: record.country ?? undefined,
                  zip: record.zip ?? undefined,
                }
              : undefined,
          }
        : undefined,
  };
}

export async function updateShopOwner(shop: string, owner: ShopOwner) {
  await prisma.shop.update({
    where: { shopDomain: shop },
    data: {
      ownerName: owner.name,
      ownerEmail: owner.email,
      phone: owner.phone,
      address1: owner.address?.address1,
      city: owner.address?.city,
      province: owner.address?.province,
      country: owner.address?.country,
      zip: owner.address?.zip,
    },
  });
}

export async function uninstallShop(shop: string) {
  await prisma.shop.deleteMany({
    where: { shopDomain: shop },
  });
}
