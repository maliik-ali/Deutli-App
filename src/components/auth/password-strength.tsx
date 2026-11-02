import { passwordStrength } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-full bg-border transition-colors",
              password && i <= score && (score >= 3 ? "bg-ink" : "bg-gold")
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
        Use 8+ characters with a letter and a number.
      </p>
    </div>
  );
}
