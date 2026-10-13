import { describe, expect, it } from "vitest";
import { chipsFor, ghostFor, matchSuggestions, suggestionText, topSuggestions, type SuggestionItem } from "./smartSuggest";
import { collect, dayText } from "../hooks/useSuggestionPool";
import { parseNatural } from "./naturalLanguage";

const item = (title: string, details = "", uses = 1, lastUsed = "2026-10-01"): SuggestionItem => ({ title, details, uses, lastUsed });

const pool = [
  item("Academia", "seg qua sex 18:00", 8),
  item("Aula de inglês", "ter qui 14:00-15:00", 5),
  item("Ler 20 páginas", "21:00", 3),
  item("Inglês com a Ana", "", 1),
  item("Beber água", "", 12),
];

describe("matchSuggestions", () => {
  it("matches the start of a title, without caring about accents or case", () => {
    expect(matchSuggestions("ingl", pool).map((i) => i.title)).toEqual(["Inglês com a Ana", "Aula de inglês"]);
    expect(matchSuggestions("ACAD", pool).map((i) => i.title)).toEqual(["Academia"]);
  });

  it("ranks starts-with above word-start, and more used above less used", () => {
    expect(matchSuggestions("a", pool).map((i) => i.title)[0]).toBe("Academia");
  });

  it("skips an exact match that has nothing to add, but keeps one that remembers details", () => {
    expect(matchSuggestions("Beber água", pool)).toEqual([]);
    expect(matchSuggestions("Academia", pool).map((i) => i.title)).toEqual(["Academia"]);
  });
});

describe("completion and recents", () => {
  it("completes the typed text from the best past entry", () => {
    expect(ghostFor("Acad", pool)).toMatchObject({ rest: "emia" });
    expect(ghostFor("zzz", pool)).toBeNull();
    expect(ghostFor("Academia", pool)).toBeNull();
  });

  it("offers the most used entries first when the field is empty", () => {
    expect(topSuggestions(pool, 2).map((i) => i.title)).toEqual(["Beber água", "Academia"]);
  });

  it("puts the remembered details back into the text so the parser reads them", () => {
    const text = suggestionText(pool[0]);
    expect(text).toBe("Academia seg qua sex 18:00");
    expect(parseNatural(text)).toMatchObject({ title: "Academia", days: [0, 2, 4], startTime: "18:00" });
    expect(parseNatural(suggestionText(pool[1]))).toMatchObject({ title: "Aula de inglês", days: [1, 3], startTime: "14:00", endTime: "15:00" });
  });
});

describe("history", () => {
  it("folds repeats into one entry that remembers the latest details", () => {
    const folded = collect([
      { title: "Academia", details: "seg 18:00", when: "2026-10-01" },
      { title: "academia", details: "seg qua 19:00", when: "2026-10-05" },
      { title: "Leitura", details: "", when: "2026-10-02" },
    ]);
    expect(folded.find((i) => i.title === "academia")).toMatchObject({ details: "seg qua 19:00", uses: 2 });
    expect(folded).toHaveLength(2);
  });

  it("writes weekdays the way people type them", () => {
    expect(dayText([4, 0, 2])).toBe("seg qua sex");
    expect(dayText([0, 1, 2, 3, 4])).toBe("dias úteis");
    expect(dayText([5, 6])).toBe("fim de semana");
    expect(dayText([0, 1, 2, 3, 4, 5, 6])).toBe("todo dia");
  });
});

describe("shortcuts", () => {
  it("hides the ones for things already in the text", () => {
    const labels = (text: string) => chipsFor("task", parseNatural(text)).map((c) => c.label);
    expect(labels("Pagar conta")).toContain("Amanhã");
    expect(labels("Pagar conta amanhã")).not.toContain("Amanhã");
    expect(labels("Pagar conta 14h")).not.toContain("14h");
    expect(labels("Pagar conta !!")).not.toContain("Urgente");
  });
});
