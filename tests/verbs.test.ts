import { describe, expect, it } from "vitest";

import { readVerbsSheet } from "../src/lib/verbs/csv";
import { buildVerbQuestions, type VerbItem } from "../src/lib/verbs/game";

const verb = (id: string, german: string, over: Partial<VerbItem> = {}): VerbItem => ({
  id, german, praesens: `er ${german}t`, praeteritum: `${german}te`, perfekt: `hat ${german}t`, preposition: null, verbCase: null,
  translations: { en: german }, exampleDe: null, exampleTranslations: {}, right: 0, wrong: 0, box: 0, due: false, ...over,
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

describe("believable wrong options", () => {
  const strong = (id: string, german: string, praeteritum: string, perfekt: string, over: Partial<VerbItem> = {}) => verb(id, german, { praeteritum, perfekt, ...over });
  const list = [
    strong("1", "schlagen", "schlug", "hat geschlagen"),
    strong("2", "fahren", "fuhr", "ist gefahren"),
    strong("3", "tragen", "trug", "hat getragen"),
    strong("4", "laden", "lud", "hat geladen"),
    strong("5", "abfahren", "fuhr ab", "ist abgefahren"),
  ];
  it("offers the regular form of a strong verb and the other auxiliary", () => {
    let regular = false;
    let aux = false;
    for (let i = 0; i < 80; i++) {
      for (const q of buildVerbQuestions(list, "forms", 5)) {
        if (q.german === "schlagen" && q.ask === "praeteritum" && q.options.includes("schlagte")) regular = true;
        if (q.german === "fahren" && q.ask === "perfekt" && q.options.includes("hat gefahren")) aux = true;
        if (q.german === "abfahren" && q.ask === "praeteritum") expect(q.options).toContain("fahrte ab");
      }
    }
    expect(regular).toBe(true);
    expect(aux).toBe(true);
  });
  it("offers the usual confusions for a preposition", () => {
    const l = [verb("1", "warten", { preposition: "auf", verbCase: "Akk" })];
    for (let i = 0; i < 20; i++) {
      const q = buildVerbQuestions(l, "prepositions", 1)[0];
      expect(q.options).toContain("an");
      expect(q.options).toContain("für");
      expect(q.options).toHaveLength(4);
    }
  });
  it("asks due verbs first and can ask only them", () => {
    const l = Array.from({ length: 30 }, (_, i) => strong(String(i), `verb${i}en`, `verb${i}te`, `hat verb${i}t`, { due: i < 3 }));
    for (let i = 0; i < 20; i++) {
      const ids = buildVerbQuestions(l, "forms", 10).map((q) => q.verbId);
      expect(ids).toEqual(expect.arrayContaining(["0", "1", "2"]));
      expect(buildVerbQuestions(l, "forms", 10, true).map((q) => q.verbId).sort()).toEqual(["0", "1", "2"]);
    }
  });
});
