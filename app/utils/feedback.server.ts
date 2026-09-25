import prisma from "./prisma.server";

export type FeedbackInput = {
  companyName: string;
  brandName: string;
  websiteUrl: string;
  howDidYouHear: string;
  associatedWithAdbuffs: string;
  experienceRating: string;
  feedback: string;
};

export type FeedbackErrors = Partial<Record<keyof FeedbackInput, string>>;

export function readFeedbackInput(formData: FormData): FeedbackInput {
  return {
    companyName: String(formData.get("companyName") ?? "").trim(),
    brandName: String(formData.get("brandName") ?? "").trim(),
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
    howDidYouHear: String(formData.get("howDidYouHear") ?? "").trim(),
    associatedWithAdbuffs: String(formData.get("associatedWithAdbuffs") ?? "").trim(),
    experienceRating: String(formData.get("experienceRating") ?? "").trim(),
    feedback: String(formData.get("feedback") ?? "").trim(),
  };
}

export function validateFeedback(input: FeedbackInput): FeedbackErrors {
  const errors: FeedbackErrors = {};

  if (!input.companyName) errors.companyName = "Company Name is required.";
  if (!input.feedback) errors.feedback = "Feedback is required.";

  if (input.websiteUrl) {
    try {
      const url = new URL(input.websiteUrl);
      if (!/^https?:$/.test(url.protocol)) throw new Error("Unsupported protocol");
    } catch {
      errors.websiteUrl = "Please enter a valid http or https URL.";
    }
  }

  return errors;
}

export async function listFeedback(shop: string) {
  return prisma.feedback.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFeedback(shop: string, input: FeedbackInput) {
  return prisma.feedback.create({
    data: {
      shop,
      companyName: input.companyName,
      brandName: input.brandName || null,
      websiteUrl: input.websiteUrl || null,
      howDidYouHear: input.howDidYouHear || null,
      associatedWithAdbuffs: input.associatedWithAdbuffs || null,
      feedback: input.feedback,
    },
  });
}

export async function getFeedback(shop: string, id: string) {
  return prisma.feedback.findFirst({ where: { id, shop } });
}

export async function updateFeedback(shop: string, id: string, input: FeedbackInput) {
  return prisma.feedback.updateMany({
    where: { id, shop },
    data: {
      companyName: input.companyName,
      brandName: input.brandName || null,
      websiteUrl: input.websiteUrl || null,
      howDidYouHear: input.howDidYouHear || null,
      associatedWithAdbuffs: input.associatedWithAdbuffs || null,
      feedback: input.feedback,
    },
  });
}

export async function deleteFeedback(shop: string, id: string) {
  return prisma.feedback.deleteMany({ where: { id, shop } });
}
