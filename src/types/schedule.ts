export interface WeeklyScheduleBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWeeklyScheduleBlockInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  color?: string;
}

export interface UpdateWeeklyScheduleBlockInput {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  color: string;
}
