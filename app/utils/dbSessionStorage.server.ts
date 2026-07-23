import { Prisma } from "@prisma/client";
import { Session } from "@shopify/shopify-app-react-router/server";
import prisma from "./prisma.server";

function parseSessionData(data: string): ReturnType<Session["toPropertyArray"]> {
  let parsed = JSON.parse(data);

  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  return parsed;
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

// export async function loadSession(id: string): Promise<Session | undefined> {
//   const record = await prisma.session.findUnique({
//     where: { id },
//     select: { data: true },
//   });

//   if (!record) return undefined;
//   return Session.fromPropertyArray(JSON.parse(record.data as string));
// }

export async function loadSession(id: string): Promise<Session | undefined> {
  const record = await prisma.session.findUnique({
    where: { id },
    select: { data: true },
  });

  if (!record) return undefined;

  return Session.fromPropertyArray(parseSessionData(record.data as string));
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
    select: { data: true },
  });

  return sessions
    .map((session) => Session.fromPropertyArray(parseSessionData(session.data as string)))
    .filter((session): session is Session => Boolean(session));
}
