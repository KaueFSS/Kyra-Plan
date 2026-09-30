import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { describeParsed, nextWeekday, parseNatural } from "./naturalLanguage";

// Monday, 28 Sep 2026, 10:00.
const now = DateTime.fromISO("2026-09-28T10:00:00");

describe("parseNatural", () => {
  it("reads weekdays and a time", () => {
    const p = parseNatural("Academia seg qua sex 18h", now);
    expect(p).toMatchObject({ title: "Academia", days: [0, 2, 4], startTime: "18:00", endTime: null });
  });

  it("reads a relative date and a time range", () => {
    const p = parseNatural("Prova de estatística amanhã 9h-11h", now);
    expect(p).toMatchObject({ title: "Prova de estatística", date: "2026-09-29", startTime: "09:00", endTime: "11:00" });
  });

  it("reads HH:MM ranges with spaces and full day names", () => {
    const p = parseNatural("Aula de cálculo segunda e quarta 08:00 - 10:00", now);
    expect(p.days).toEqual([0, 2]);
    expect(p.startTime).toBe("08:00");
    expect(p.endTime).toBe("10:00");
    expect(p.title).toBe("Aula de cálculo");
  });

  it("keeps connector words that belong to the title", () => {
    expect(parseNatural("Comprar pão e leite amanhã", now).title).toBe("Comprar pão e leite");
  });

  it("expands day ranges and groups", () => {
    expect(parseNatural("Acordar seg a sex 06:30", now).days).toEqual([0, 1, 2, 3, 4]);
    expect(parseNatural("Faxina fim de semana", now).days).toEqual([5, 6]);
    expect(parseNatural("Ler sex a dom", now).days).toEqual([4, 5, 6]);
  });

  it("reads recurrence words", () => {
    const p = parseNatural("Reunião toda semana qui 14h30", now);
    expect(p).toMatchObject({ title: "Reunião", recurrence: "weekly", days: [3], startTime: "14:30" });
    expect(parseNatural("Beber água todo dia", now).recurrence).toBe("daily");
  });

  it("treats 'toda quinta' and plural days as weekly, a bare day as one-off", () => {
    expect(parseNatural("Inglês toda quinta 19h", now).recurrence).toBe("weekly");
    expect(parseNatural("Futebol às terças", now).recurrence).toBe("weekly");
    expect(parseNatural("Dentista quinta 15h", now).recurrence).toBeNull();
  });

  it("reads explicit dates", () => {
    expect(parseNatural("Consulta 15/10 às 14h", now)).toMatchObject({ title: "Consulta", date: "2026-10-15", startTime: "14:00" });
    expect(parseNatural("Aniversário dia 3", now).date).toBe("2026-10-03");
  });

  it("does not mistake words or plain numbers for days/times", () => {
    const p = parseNatural("Terminar segredo do quarto 2", now);
    expect(p).toMatchObject({ title: "Terminar segredo do quarto 2", days: [], startTime: null });
  });

  it("reads durations without confusing them with clock times", () => {
    expect(parseNatural("Estudar Python por 1h", now)).toMatchObject({ title: "Estudar Python", durationMinutes: 60, startTime: null });
    expect(parseNatural("Ler 30 min", now)).toMatchObject({ title: "Ler", durationMinutes: 30 });
    expect(parseNatural("Inglês 2 horas seg qua 19h", now)).toMatchObject({ title: "Inglês", durationMinutes: 120, startTime: "19:00", days: [0, 2] });
    expect(parseNatural("Meditar durante 1h30", now).durationMinutes).toBe(90);
    expect(parseNatural("Correr meia hora", now).durationMinutes).toBe(30);
    expect(parseNatural("Academia 18h", now)).toMatchObject({ startTime: "18:00", durationMinutes: null });
  });

  it("rejects impossible times", () => {
    expect(parseNatural("Treino 25h", now).startTime).toBeNull();
  });

  it("describes what it understood", () => {
    expect(describeParsed(parseNatural("Prova amanhã 9h-11h", now), now)).toEqual(["Amanhã", "09:00–11:00"]);
  });
});

describe("nextWeekday", () => {
  it("returns today when it already is that weekday", () => {
    expect(nextWeekday(0, now)).toBe("2026-09-28");
    expect(nextWeekday(2, now)).toBe("2026-09-30");
    expect(nextWeekday(6, now)).toBe("2026-10-04");
  });
});
