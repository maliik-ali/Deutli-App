import { SUPPORT, whatsappLink } from "@/lib/support/contact";

/** Brand icons (the same drawings as the footer of deutli.com). */
const SOCIALS = [
  { label: "Instagram", href: SUPPORT.instagram, path: "M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" },
  { label: "Facebook", href: SUPPORT.facebook, path: "M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14A28 28 0 0 0 14.64 2C11.93 2 10 3.66 10 6.7v2.8H7v4h3V22h4v-8.5Z" },
  { label: "YouTube", href: SUPPORT.youtube, path: "M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8ZM10 15V9l5.2 3-5.2 3Z" },
  { label: "WhatsApp", href: whatsappLink(), path: "M12.04 2A9.94 9.94 0 0 0 3.5 17.04L2 22l5.1-1.34A9.94 9.94 0 1 0 12.04 2Zm0 18.1c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.03.8.81-2.95-.2-.31A8.1 8.1 0 1 1 12.04 20.1Zm4.44-6.07c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" },
] as const;

/** Round icon buttons for Instagram, Facebook, YouTube and WhatsApp. */
export function SocialLinks() {
  return (
    <ul className="flex flex-wrap gap-2.5" aria-label="Deutli on social media">
      {SOCIALS.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-gold-ink/60 hover:bg-gold-soft hover:text-foreground motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <svg viewBox="0 0 24 24" className="size-[18px] fill-current" aria-hidden>
              <path d={s.path} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
