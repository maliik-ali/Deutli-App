import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms of use" };

// DRAFT in plain words. Have it checked by a lawyer before the public launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="15 November 2026">
      <p>By creating a Deutli account you agree to these terms.</p>
      <h2>What Deutli is</h2>
      <p>Deutli is a practice platform for the German B1 exam. Our mock exams, certificates and scores are practice material. They are not official exam results or official certificates, and they do not promise a pass.</p>
      <h2>AI help</h2>
      <p>AI feedback and translations are guidance and can be wrong. Where a teacher confirms a result, the teacher&apos;s decision is final.</p>
      <h2>Your account</h2>
      <ul>
        <li>Keep your password private and do not share your account.</li>
        <li>Give correct details when you sign up.</li>
        <li>Do not copy, resell or share our exam papers, audio or texts.</li>
      </ul>
      <h2>Pro and payments</h2>
      <p>Pro access starts after we confirm your payment and lasts for the period of the plan you chose. Prices are shown before you pay.</p>
      <h2>Changes</h2>
      <p>We may improve or change Deutli and these terms. If something important changes, we will tell you in the app.</p>
    </LegalPage>
  );
}
