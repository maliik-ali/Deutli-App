/**
 * Reputation badges. All of them are worked out from real data, none can be bought or switched on by the teacher
 * (except "Verified by Deutli", which only a Deutli admin sets). The rules are in one place so the page, the directory
 * and the teacher's own hints always agree.
 */
export type TeacherStats = {
  reviewCount: number;
  average: number;
  /** Reviews the teacher has answered. */
  replied: number;
  /** Classes held with at least one student marked present. */
  classesTaught: number;
  verified: boolean;
};

export type BadgeId = "verified" | "top_rated" | "experienced" | "replies";
export type Badge = { id: BadgeId; label: string; why: string };

export const RULES = {
  topRated: { reviews: 5, average: 4.5 },
  replies: { reviews: 3, share: 0.8 },
  experienced: [20, 100],
} as const;

export function earnedBadges(s: TeacherStats): Badge[] {
  const out: Badge[] = [];
  if (s.verified) out.push({ id: "verified", label: "Verified by Deutli", why: "Deutli checked this teacher's certificate or qualification." });
  if (s.reviewCount >= RULES.topRated.reviews && s.average >= RULES.topRated.average) {
    out.push({ id: "top_rated", label: "Top rated", why: `An average of ${RULES.topRated.average} or higher from ${RULES.topRated.reviews} or more verified reviews.` });
  }
  const [first, second] = RULES.experienced;
  if (s.classesTaught >= first) {
    const n = s.classesTaught >= second ? second : first;
    out.push({ id: "experienced", label: `${n}+ classes taught`, why: `Has taught ${n} or more classes on Deutli with students present.` });
  }
  if (s.reviewCount >= RULES.replies.reviews && s.replied / s.reviewCount >= RULES.replies.share) {
    out.push({ id: "replies", label: "Replies to reviews", why: "Answers at least 8 in 10 reviews from students." });
  }
  return out;
}

/** The closest badge the teacher does not have yet, in plain words. Null when they have everything open to them. */
export function nextBadgeHint(s: TeacherStats): string | null {
  const have = new Set(earnedBadges(s).map((b) => b.id));
  const hints: { gap: number; text: string }[] = [];
  if (!have.has("top_rated")) {
    const need = Math.max(0, RULES.topRated.reviews - s.reviewCount);
    if (need > 0) hints.push({ gap: need, text: `${need} more verified review${need === 1 ? "" : "s"} (average ${RULES.topRated.average} or higher) earn Top rated.` });
    else hints.push({ gap: 5, text: `Top rated needs an average of ${RULES.topRated.average} or higher. Yours is ${s.average.toFixed(1)}.` });
  }
  if (!have.has("replies")) {
    if (s.reviewCount < RULES.replies.reviews) {
      const need = RULES.replies.reviews - s.reviewCount;
      hints.push({ gap: need + 1, text: `Once you have ${RULES.replies.reviews} reviews, answering 8 in 10 earns Replies to reviews.` });
    } else {
      const unanswered = s.reviewCount - s.replied;
      const toGo = Math.ceil(RULES.replies.share * s.reviewCount) - s.replied;
      if (toGo > 0 && unanswered > 0) hints.push({ gap: toGo, text: `Answer ${toGo} more review${toGo === 1 ? "" : "s"} to earn Replies to reviews.` });
    }
  }
  if (!have.has("experienced")) {
    const need = RULES.experienced[0] - s.classesTaught;
    if (need > 0) hints.push({ gap: need, text: `${need} more class${need === 1 ? "" : "es"} with students present earn ${RULES.experienced[0]}+ classes taught. Tick Present on each class.` });
  }
  hints.sort((a, b) => a.gap - b.gap);
  return hints[0]?.text ?? null;
}
