type FeedbackEmail = {
  companyName: string;
  brandName: string;
  websiteUrl: string;
  discoverySource: string;
  associationStatus: string;
  experienceRating: string;
  feedback: string;
  storeOwnerName: string;
  storeOwnerEmail: string;
  shop: string;
};

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const appOwnerEmail = process.env.APP_OWNER_EMAIL;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS;

  if (!apiKey || !appOwnerEmail || !fromEmail) {
    throw new Error("Email configuration is incomplete.");
  }

  return { apiKey, appOwnerEmail, fromEmail };
}

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  fromEmail: string,
  apiKey: string,
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to: [to], subject, text }),
  });

  if (!response.ok) {
    throw new Error(`Email provider returned HTTP ${response.status}.`);
  }
}

export async function sendFeedbackEmails(feedback: FeedbackEmail) {
  const { apiKey, appOwnerEmail, fromEmail } = getEmailConfig();
  const senderName = feedback.storeOwnerName || feedback.storeOwnerEmail;

  const appOwnerMessage = [
    `Feedback submitted by ${senderName}.`,
    "",
    `Shopify store: ${feedback.shop}`,
    `Company Name: ${feedback.companyName}`,
    `Brand Name: ${feedback.brandName || "Not provided"}`,
    `Website URL: ${feedback.websiteUrl || "Not provided"}`,
    `How they heard about Adbuffs: ${feedback.discoverySource || "Not provided"}`,
    `Currently associated with Adbuffs: ${feedback.associationStatus || "Not provided"}`,
    `Experience rating: ${feedback.experienceRating || "Not provided"}`,
    `Feedback: ${feedback.feedback || "Not provided"}`,
    `Store Owner Email: ${feedback.storeOwnerEmail}`,
  ].join("\n");

  await sendEmail(
    appOwnerEmail,
    `New Adbuffs feedback from ${senderName}`,
    appOwnerMessage,
    fromEmail,
    apiKey,
  );

  await sendEmail(
    feedback.storeOwnerEmail,
    "Thank you for submitting your feedback",
    "Thank you for submitting the feedback form.\n\nWe appreciate your time and feedback.",
    fromEmail,
    apiKey,
  );
}