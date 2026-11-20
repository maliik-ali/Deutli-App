import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(__dirname, "../../supabase/migrations");
const sql = readdirSync(dir)
  .sort()
  .map((f) => readFileSync(join(dir, f), "utf8"))
  .join("\n");

const tables = [...new Set([...sql.matchAll(/create table(?: if not exists)?\s+public\.(\w+)/gi)].map((m) => m[1]))];

describe("database safety rules (read from the migration files)", () => {
  it("finds the tables", () => {
    expect(tables.length).toBeGreaterThan(20);
  });

  it.each(tables)("%s has Row Level Security switched on", (t) => {
    expect(sql).toMatch(new RegExp(`alter table\\s+public\\.${t}\\s+enable row level security`, "i"));
  });

  it("only the server may use the rate limiter and the privileged functions", () => {
    for (const fn of ["use_translation", "register_for_class", "check_rate_limit"]) {
      expect(sql, fn).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated`, "i"));
    }
  });

  it("every SECURITY DEFINER function pins its search_path", () => {
    const fns = sql.split(/create (?:or replace )?function/i).slice(1).filter((b) => /security definer/i.test(b.split(/\$\$/)[0]));
    expect(fns.length).toBeGreaterThan(0);
    for (const f of fns) expect(f.split(/\$\$/)[0]).toMatch(/set search_path\s*=\s*''/i);
  });

  it("students can never edit their own role, Pro status or teacher (column grants on profiles)", () => {
    const granted = [...sql.matchAll(/grant update \(([^)]*)\) on public\.profiles to authenticated/gi)].flatMap((m) => m[1].split(",").map((c) => c.trim()));
    expect(granted.length).toBeGreaterThan(0);
    for (const forbidden of ["role", "pro_until", "teacher_id", "teacher_code", "academy_id", "exam", "onboarded_at", "id"]) {
      expect(granted, forbidden).not.toContain(forbidden);
    }
  });
});
