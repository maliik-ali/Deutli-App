/** Where students can reach Deutli. Shown on the Support page. */
export const SUPPORT = {
  email: "help@deutli.com",
  whatsappDisplay: "+49 1521 5126840",
  whatsappNumber: "4915215126840",
  instagram: "https://www.instagram.com/deutli0/",
  facebook: "https://www.facebook.com/deutli",
} as const;

/** A WhatsApp chat link with a ready first line. */
export const whatsappLink = (text = "Hi Deutli, I need help with ") =>
  `https://wa.me/${SUPPORT.whatsappNumber}?text=${encodeURIComponent(text)}`;

export const FEEDBACK_KINDS = [
  { id: "problem", label: "Problem", hint: "Something is broken or confusing" },
  { id: "payment", label: "Payment", hint: "Paying, Pro, or a refund" },
  { id: "question", label: "Question", hint: "I need help with something" },
  { id: "idea", label: "Idea", hint: "Something that would help me" },
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]["id"];
export const MAX_FEEDBACK = 2000;
export const MIN_FEEDBACK = 5;
