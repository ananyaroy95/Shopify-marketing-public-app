import { Session } from "@shopify/shopify-app-react-router/server";
import prisma from "./prisma.server";

function parseSessionData(data: string): ReturnType<Session["toPropertyArray"]> {
  let parsed = JSON.parse(data);

  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  return parsed;
}

/**
 * Public apps must use expiring offline tokens. Non-expiring tokens are
 * rejected by the Admin API with HTTP 403. Those sessions never look
 * "expired", so the auth layer keeps reusing them unless we discard them.
 */
function isUsableSession(session: Session): boolean {
  if (session.isOnline) return true;
  if (session.refreshToken) return true;

  console.warn(
    `[session] Discarding non-expiring offline token for ${session.shop} (id=${session.id}). ` +
      `Next request will exchange for an expiring token.`,
  );
  return false;
}

export async function storeSession(session: Session): Promise<boolean> {
  await prisma.session.upsert({
    where: { id: session.id },
    create: {
      id: session.id,
      shop: session.shop,
      data: JSON.stringify(session.toPropertyArray()),
    },
    update: {
      shop: session.shop,
      data: JSON.stringify(session.toPropertyArray()),
    },
  });

  return true;
}

export async function loadSession(id: string): Promise<Session | undefined> {
  const record = await prisma.session.findUnique({
    where: { id },
    select: { data: true },
  });

  if (!record) return undefined;

  const session = Session.fromPropertyArray(parseSessionData(record.data as string));
  if (!session) return undefined;

  if (!isUsableSession(session)) {
    await prisma.session.deleteMany({ where: { id } });
    return undefined;
  }

  return session;
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await prisma.session.deleteMany({
    where: { id },
  });
  return result.count > 0;
}

export async function deleteSessions(ids: string[]): Promise<boolean> {
  const result = await prisma.session.deleteMany({
    where: { id: { in: ids } },
  });
  return result.count > 0;
}

export async function findSessionIdsByShop(shop: string): Promise<string[]> {
  const sessions = await prisma.session.findMany({
    where: { shop },
    select: { id: true },
  });

  return sessions.map((session) => session.id);
}

export async function findSessionsByShop(shop: string): Promise<Session[]> {
  const sessions = await prisma.session.findMany({
    where: { shop },
    select: { id: true, data: true },
  });

  const usable: Session[] = [];

  for (const record of sessions) {
    const session = Session.fromPropertyArray(parseSessionData(record.data as string));
    if (!session) continue;

    if (!isUsableSession(session)) {
      await prisma.session.deleteMany({ where: { id: record.id } });
      continue;
    }

    usable.push(session);
  }

  return usable;
}
