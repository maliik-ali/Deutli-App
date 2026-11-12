import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like an email address. Check it and try again.");

export const passwordRules = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Add at least one letter.")
  .regex(/[0-9]/, "Add at least one number.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const fullNameRules = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Your name is too long — use 120 characters or fewer.");

export const phoneRules = z
  .string()
  .trim()
  .max(20, "Phone number is too long.")
  .refine((v) => v === "" || /^\+?[0-9][0-9\s-]{6,18}$/.test(v), {
    message: "Use digits only, for example +92 300 1234567.",
  });

export const signupSchema = z.object({
  fullName: fullNameRules,
  email,
  phone: phoneRules,
  password: passwordRules,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password: passwordRules,
    confirmPassword: z.string().min(1, "Type your new password again."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords don't match.",
  })
  .refine((v) => v.password !== v.currentPassword, {
    path: ["password"],
    message: "Your new password must be different from your current one.",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: passwordRules,
    confirmPassword: z.string().min(1, "Type your new password again."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords don't match.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Rough strength score 0–4 for the hint under the password field. */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) score = Math.min(score, 1);
  const s = score as 0 | 1 | 2 | 3 | 4;
  const label = ["Too short", "Weak", "Okay", "Good", "Strong"][s];
  return { score: s, label };
}
