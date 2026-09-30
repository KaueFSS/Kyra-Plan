export interface WorldClock {
  id: string;
  city: string;
  timezone: string;
  position: number;
  createdAt: string;
}

export interface CreateWorldClockInput {
  city: string;
  timezone: string;
}
