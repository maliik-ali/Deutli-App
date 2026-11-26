import { describe, expect, it } from "vitest";

import { readVerbsSheet } from "../src/lib/verbs/csv";
import { buildVerbQuestions, type VerbItem } from "../src/lib/verbs/game";

const verb = (id: string, german: string, over: Partial<VerbItem> = {}): VerbItem => ({
  id, german, praesens: `er ${german}t`, praeteritum: `${german}te`, perfekt: `hat ${german}t`, preposition: null, verbCase: null,
  translations: { en: german }, exampleDe: null, exampleTranslations: {}, right: 0, wrong: 0, ...over,
});

describe("verbs sheet", () => {
  const head = "german,praesens,praeteritum,perfekt,preposition,case,en,ur,example_de,example_de_en";
  it("reads forms, meanings and example translations", () => {
    const r = readVerbsSheet(`${head}\nabhängen,es hängt ab,hing ab,hat abgehangen,von,Dat,to depend on,پر منحصر,Es hängt ab.,It depends.`);
    if ("error" in r) throw new Error(r.error);
    expect(r.rows[0]).toMatchObject({ german: "abhängen", preposition: "von", verbCase: "Dat", perfekt: "hat abgehangen" });
    expect(r.rows[0].translations).toEqual({ en: "to depend on", ur: "پر منحصر" });
    expect(r.rows[0].exampleTranslations).toEqual({ en: "It depends." });
  });
  it("keeps one verb with different prepositions, skips an exact repeat", () => {
    const r = readVerbsSheet(`${head}\narbeiten,,,,an,Dat,to work on,,,\narbeiten,,,,bei,Dat,to work at,,,\narbeiten,,,,bei,Dat,to work at,,,`);
    if ("error" in r) throw new Error(r.error);
    expect(r.rows).toHaveLength(2);
    expect(r.problems).toHaveLength(1);
  });
  it("needs a german column and a meaning", () => {
    expect("error" in readVerbsSheet("a,b\n1,2")).toBe(true);
    const r = readVerbsSheet(`${head}\nsehen,,,,,,,,,`);
    if ("error" in r) throw new Error(r.error);
    expect(r.rows).toHaveLength(0);
  });
});

describe("verb questions", () => {
  it("never offers another correct preposition of the same verb", () => {
    const list = [verb("1", "arbeiten", { preposition: "an", verbCase: "Dat" }), verb("2", "arbeiten", { preposition: "bei" }), verb("3", "arbeiten", { preposition: "in" })];
    for (let i = 0; i < 50; i++) {
      for (const q of buildVerbQuestions(list, "prepositions", 3)) {
        const valid = ["an", "bei", "in"];
        expect(q.options.filter((o) => valid.includes(o))).toEqual([q.answer]);
        expect(q.options).toContain(q.answer);
      }
    }
  });
  it("forms questions have the right answer once among the options", () => {
    const list = ["a", "b", "c", "d"].map((x, i) => verb(String(i), `verb${x}`));
    for (const q of buildVerbQuestions(list, "forms", 4)) {
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });
});
