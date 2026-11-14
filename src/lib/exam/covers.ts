/**
 * City photos for the mock exam covers, keyed by the mock's web address (slug).
 * A mock without a photo here keeps the Deutli owl cover. The four tone gradients
 * (navy, violet, teal, indigo) stay in exam-cover.tsx and tint the bottom of every photo.
 * Photos: Unsplash (free licence), see docs/COVER-IMAGES.md.
 */
export const COVER_PHOTOS: Record<string, { src: string; position: string }> = {
  hamburg: { src: "/covers/hamburg.jpg", position: "object-[50%_40%]" },
  koeln: { src: "/covers/koeln.jpg", position: "object-[35%_50%]" },
  muenchen: { src: "/covers/muenchen.jpg", position: "object-[50%_40%]" },
  leipzig: { src: "/covers/leipzig.jpg", position: "object-[50%_30%]" },
  bremen: { src: "/covers/bremen.jpg", position: "object-[50%_55%]" },
  dresden: { src: "/covers/dresden.jpg", position: "object-[50%_30%]" },
  freiburg: { src: "/covers/freiburg.jpg", position: "object-[40%_50%]" },
  kiel: { src: "/covers/kiel.jpg", position: "object-[50%_50%]" },
};
