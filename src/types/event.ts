export type RecurrenceRule = "none" | "daily" | "weekly" | "monthly";

export interface Event {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  color: string;
  recurrenceRule: RecurrenceRule;
  recurrenceUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventOccurrence extends Event {
  occurrenceStart: string;
  occurrenceEnd: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  color?: string;
  recurrenceRule?: RecurrenceRule;
  recurrenceUntil?: string | null;
}

export interface UpdateEventInput {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  color: string;
  recurrenceRule: RecurrenceRule;
  recurrenceUntil?: string | null;
}
