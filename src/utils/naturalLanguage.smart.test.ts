import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { parseNatural } from "./naturalLanguage";

// Monday, 28 Sep 2026, 10:00.
const now = DateTime.fromISO("2026-09-28T10:00:00");
const p = (text: string) => parseNatural(text, now);

describe("English", () => {
  it("reads tomorrow and a 12-hour time", () => {
    expect(p("Call dentist tomorrow at 3pm")).toMatchObject({ title: "Call dentist", date: "2026-09-29", startTime: "15:00" });
  });

  it("reads weekly recurrence on named days", () => {
    expect(p("Gym every monday and friday 6pm")).toMatchObject({ title: "Gym", days: [0, 4], recurrence: "weekly", startTime: "18:00" });
  });

  it("reads am/pm ranges, with the meridiem shared", () => {
    expect(p("Meeting oct 15 2:30pm-4pm")).toMatchObject({ title: "Meeting", date: "2026-10-15", startTime: "14:30", endTime: "16:00" });
    expect(p("Study 2-4pm")).toMatchObject({ startTime: "14:00", endTime: "16:00" });
  });

  it("reads durations in words", () => {
    expect(p("Study for 2 hours")).toMatchObject({ title: "Study", durationMinutes: 120 });
    expect(p("Call mom for half an hour")).toMatchObject({ title: "Call mom", durationMinutes: 30 });
    expect(p("Read for 1h30")).toMatchObject({ title: "Read", durationMinutes: 90 });
  });

  it("reads weekdays, weekends and tonight", () => {
    expect(p("Yoga weekdays 7am")).toMatchObject({ title: "Yoga", days: [0, 1, 2, 3, 4], startTime: "07:00" });
    expect(p("Workout tonight")).toMatchObject({ title: "Workout", date: "2026-09-28", startTime: "20:00" });
  });
});

describe("Portuguese, beyond the basics", () => {
  it("reads parts of the day", () => {
    expect(p("Reunião toda quinta de manhã")).toMatchObject({ title: "Reunião", days: [3], recurrence: "weekly", startTime: "09:00" });
    expect(p("Jantar hoje às 7 da noite")).toMatchObject({ title: "Jantar", date: "2026-09-28", startTime: "19:00" });
    expect(p("Almoço meio-dia")).toMatchObject({ title: "Almoço", startTime: "12:00" });
  });

  it("reads dates by name and relative to today", () => {
    expect(p("Estudar por 1h30 dia 15 de outubro")).toMatchObject({ title: "Estudar", durationMinutes: 90, date: "2026-10-15" });
    expect(p("Entrega semana que vem")).toMatchObject({ title: "Entrega", date: "2026-10-05" });
    expect(p("Pagar aluguel em 3 dias")).toMatchObject({ title: "Pagar aluguel", date: "2026-10-01" });
    expect(p("Dentista próxima segunda 14h")).toMatchObject({ title: "Dentista", date: "2026-10-05", startTime: "14:00" });
    expect(p("Aniversário 3 jan")).toMatchObject({ title: "Aniversário", date: "2027-01-03" });
  });
});

describe("priority", () => {
  it("reads words and an isolated !", () => {
    expect(p("Pay rent in 3 days !!")).toMatchObject({ title: "Pay rent", date: "2026-10-01", priority: "high" });
    expect(p("Relatório urgente amanhã")).toMatchObject({ title: "Relatório", priority: "high", date: "2026-09-29" });
    expect(p("Arrumar a garagem prioridade baixa")).toMatchObject({ title: "Arrumar a garagem", priority: "low" });
    expect(p("Café !")).toMatchObject({ title: "Café", priority: "high" });
  });

  it("leaves punctuation inside words alone", () => {
    expect(p("Comprar leite!")).toMatchObject({ title: "Comprar leite!", priority: null });
  });
});

describe("things that should stay a title", () => {
  it("doesn't turn ordinary words into dates or times", () => {
    expect(p("Set 3 alarms").date).toBeNull();
    expect(p("Set 3 alarms").title).toBe("Set 3 alarms");
    expect(p("Ler 20 páginas")).toMatchObject({ title: "Ler 20 páginas", startTime: null, date: null });
  });
});
