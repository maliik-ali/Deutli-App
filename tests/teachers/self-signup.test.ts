import { describe, expect, it } from "vitest";

import { signupSummary } from "@/lib/teachers/signup-summary";
import { teacherSignupSchema } from "@/lib/teachers/signup-options";
import { signupSchema } from "@/lib/validation/auth";

const good = { accountType: "solo", name: "Frau Schneider", exams: ["goethe"], levels: ["B1"], studentCount: "6-30", tools: ["whatsapp"], wants: ["mocks"] };

describe("teacher self-signup answers", () => {
  it("accepts good answers", () => {
    expect(teacherSignupSchema.safeParse(good).success).toBe(true);
  });
  it("needs a name", () => {
    expect(teacherSignupSchema.safeParse({ ...good, name: " " }).success).toBe(false);
  });
  it("rejects unknown options (nothing free-form reaches the database)", () => {
    expect(teacherSignupSchema.safeParse({ ...good, exams: ["hack"] }).success).toBe(false);
    expect(teacherSignupSchema.safeParse({ ...good, accountType: "admin" }).success).toBe(false);
    expect(teacherSignupSchema.safeParse({ ...good, studentCount: "1000" }).success).toBe(false);
  });
  it("answers can be left empty except the name and type", () => {
    expect(teacherSignupSchema.safeParse({ accountType: "school", name: "Berlin Academy", exams: [], levels: [], studentCount: null, tools: [], wants: [] }).success).toBe(true);
  });
  it("writes one plain line for the admin", () => {
    const line = signupSummary({ account_type: "school", exams: ["goethe", "telc"], levels: ["A2"], student_count: "31-100", tools: ["whatsapp"], wants: ["mocks"] });
    expect(line).toContain("runs a school");
    expect(line).toContain("Goethe, telc");
    expect(line).toContain("31–100 students now");
  });
});

describe("signup form", () => {
  const base = { fullName: "Ali Khan", email: "a@b.com", phone: "", password: "abcdefg1" };
  it("only knows student or teacher as the starting point, and it is not a role", () => {
    expect(signupSchema.safeParse({ ...base, intent: "teacher" }).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, intent: "super_admin" }).success).toBe(false);
    expect(Object.keys(signupSchema.shape)).not.toContain("role");
  });
});
