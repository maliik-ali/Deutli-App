import { passwordStrength } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

/** `showRule` = also spell out the password rule (signup puts it in the field's placeholder instead). */
export function PasswordStrength({ password, showRule = true }: { password: string; showRule?: boolean }) {
  const { score, label } = passwordStrength(password);
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-full bg-border transition-colors",
              password && i <= score && (score >= 3 ? "bg-success" : "bg-gold")
            )}
          />
        ))}
      </div>
      <p aria-live="polite">
        {password ? (
          <>
            <span className="font-semibold text-foreground">{label}.</span>{" "}
          </>
        ) : null}
        {showRule && "Use 8+ characters with a letter and a number."}
      </p>
    </div>
  );
}
