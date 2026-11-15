import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

// DRAFT in plain words. Have it checked by a lawyer before the public launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="15 November 2026">
      <p>Deutli helps you prepare for the German B1 exam. This page explains what we keep about you and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: your name, email address, phone number (if you add it), and your profile photo (if you add it).</li>
        <li>Your learning: mock exam answers and results, texts you wrote, words you saved, Improve Accent practice, goals and exam date.</li>
        <li>Payments: the plan you chose and the transaction ID you send us. We never see or store your card number.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run your account and show your progress.</li>
        <li>To mark your mock exams and give feedback on your writing. Writing may be checked by an AI service and by a teacher.</li>
        <li>To translate saved words with AI. Only the word and a short sentence are sent, not your name or email.</li>
        <li>To confirm payments and answer your messages.</li>
      </ul>
      <h2>Who sees it</h2>
      <p>Your teacher and the Deutli team can see your results and writing. Service providers that run Deutli (hosting, database, login, AI and card payments) process data for us. We do not sell your data.</p>
      <h2>Your choices</h2>
      <p>You can change your details on the Account page. To see, correct or delete your data, write to us and we will help.</p>
      <h2>Contact</h2>
      <p>Questions about privacy: use the contact details on www.deutli.com.</p>
    </LegalPage>
  );
}
